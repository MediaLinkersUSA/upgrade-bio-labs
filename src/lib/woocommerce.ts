import "server-only";
import { WOO_PRODUCTS } from "./woo-products";

/**
 * Mirrors orders into the client's WooCommerce store.
 *
 * The storefront's own record lives in Supabase, but WooCommerce is where the
 * client actually works: ShipStation pulls from it to print labels, UPS Labels
 * and UBL Invoices hang off it, and their whole packing routine assumes an
 * order appears there. An order that never reaches WooCommerce is an order
 * that never gets shipped, so this is fulfilment infrastructure rather than a
 * nicety.
 *
 * Direction is deliberately one-way: we push, we never read back. Two-way sync
 * needs conflict rules nobody has agreed, and the failure mode of guessing is
 * an order marked shipped in one system and pending in the other.
 *
 * Failure here must never fail the customer's checkout. The order is already
 * safely in Supabase by the time this runs; if WooCommerce is down the mirror
 * is logged and skipped, and the order can be pushed again later. Losing the
 * sale to protect the mirror would be exactly backwards.
 */

const BASE = (process.env.WOO_STORE_URL ?? "https://upgradebiolabs.com").replace(/\/$/, "");
const KEY = process.env.WOO_CONSUMER_KEY;
const SECRET = process.env.WOO_CONSUMER_SECRET;

export const isWooConfigured = () => Boolean(KEY && SECRET);

const authHeader = () =>
  "Basic " + Buffer.from(`${KEY}:${SECRET}`).toString("base64");

/**
 * Our lifecycle mapped onto Woo's.
 *
 * `awaiting_payment` becomes on-hold rather than pending: on-hold is the
 * status their workflow already uses for "real order, money not in yet", and
 * it keeps Zelle and CashApp orders visible instead of buried with abandoned
 * checkouts.
 */
const WOO_STATUS: Record<string, string> = {
  pending_payment: "pending",
  awaiting_payment: "on-hold",
  paid: "processing",
  shipped: "completed",
  completed: "completed",
  cancelled: "cancelled",
  refunded: "refunded",
};

const PAYMENT_TITLE: Record<string, string> = {
  card: "Credit/Debit Card (Stripe)",
  zelle: "Zelle",
  cashapp: "Cash App",
};

/**
 * A quantity band ("1-2", "3-5", "5+"), identified by shape rather than
 * position, because attribute order is not guaranteed by the API.
 */
const isBand = (o: string) => /^\d+(-\d+|\+)$/.test(o.trim());

/** The band a given quantity falls in - this store's ladder is always 1-2 /
 *  3-5 / 5+, so a tier's own minQty maps onto it directly. Exported so
 *  lib/live-pricing.ts keys its lookups the exact same way this file does -
 *  "which variation do we bill" and "which variation's price do we show"
 *  must never be able to drift apart. */
export const bandForQty = (qty: number) => (qty >= 5 ? "5+" : qty >= 3 ? "3-5" : "1-2");

// ALL whitespace is stripped, not merely collapsed. Our labels are written
// "20mg" and theirs "20 MG"; collapsing spaces leaves "20mg" against "20 mg"
// and the two never match, which silently selects the wrong fill's variation.
// Exported for the same reason as bandForQty above.
export const normalizeOption = (s: string) => s.replace(/\s+/g, "").toLowerCase();
const norm = normalizeOption;

/**
 * Picks the variation matching a line's fill and quantity.
 *
 * Their variations carry two attributes - the fill ("10 MG") and a quantity
 * band ("1-2", "3-5", "5+").
 *
 * Returns undefined rather than guessing when nothing matches: a wrong
 * variation silently decrements the wrong stock, which is worse than a line
 * with no variation attached.
 */
function pickVariation(slug: string, size: string | undefined, qty: number) {
  const product = WOO_PRODUCTS[slug];
  if (!product?.variations.length) return undefined;

  const band = bandForQty(qty);

  const candidates = product.variations.filter((v) =>
    v.options.some((o) => isBand(o) && o.trim() === band)
  );

  if (!candidates.length) return undefined;

  // A single-fill product: the band alone identifies the variation.
  if (!size) return candidates.length === 1 ? candidates[0] : undefined;

  // No fallback to candidates[0]. On a multi-fill product like RT-3 that would
  // quietly bill a 20mg order against the 10mg variation.
  return candidates.find((v) =>
    v.options.some((o) => !isBand(o) && norm(o) === norm(size))
  );
}

/**
 * Live stock status for a product, fetched fresh from WooCommerce's parent
 * product endpoint (stock is tracked at the product level, not per
 * variation, in this catalog).
 *
 * Returns null - never false - when the lookup can't be trusted: Woo
 * unconfigured, the slug missing from WOO_PRODUCTS, the request failing, or
 * an unrecognised stock_status value. Callers fall back to the static
 * `inStock` already in data/products.ts on null, the same "static wins over
 * a bad signal" rule getLiveUnitPrices already follows - a network hiccup
 * must never be the reason an in-stock product looks unavailable.
 *
 * Never cached, for the same reason as getLiveUnitPrices: a status changed
 * in WP Admin should show up on the next fetch, not the next deploy.
 */
export async function getLiveStockStatus(slug: string): Promise<boolean | null> {
  if (!isWooConfigured()) return null;
  const product = WOO_PRODUCTS[slug];
  if (!product) return null;

  try {
    const res = await fetch(`${BASE}/wp-json/wc/v3/products/${product.id}`, {
      headers: { Authorization: authHeader() },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      console.error("[woo] live stock lookup failed", slug, res.status);
      return null;
    }
    const data = await res.json();
    // "onbackorder" counts as in-stock: the customer can still order it, and
    // WooCommerce itself lets checkout proceed for that status.
    if (data.stock_status === "instock" || data.stock_status === "onbackorder") return true;
    if (data.stock_status === "outofstock") return false;
    return null; // unrecognised value - don't guess
  } catch (e) {
    console.error("[woo] live stock lookup threw", slug, e);
    return null;
  }
}

/**
 * Live per-(fill, quantity-band) unit prices for a product, fetched fresh
 * from WooCommerce's variations endpoint.
 *
 * Keyed the same way pickVariation matches a line, so "which variation do we
 * bill" and "which variation's price do we show" can never disagree: a size
 * key (normalized, "" for single-fill products) plus the literal band string
 * ("1-2" / "3-5" / "5+"), e.g. "20mg::3-5".
 *
 * Never cached - this exists specifically so a price changed in WordPress
 * shows up immediately, not on the next deploy or the next cache window.
 */
export async function getLiveUnitPrices(slug: string): Promise<Map<string, number> | null> {
  if (!isWooConfigured()) return null;
  const product = WOO_PRODUCTS[slug];
  if (!product) return null;

  try {
    const res = await fetch(
      `${BASE}/wp-json/wc/v3/products/${product.id}/variations?per_page=100`,
      {
        headers: { Authorization: authHeader() },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      }
    );
    if (!res.ok) {
      console.error("[woo] live price lookup failed", slug, res.status);
      return null;
    }
    const data = await res.json();
    if (!Array.isArray(data)) return null;

    // Parsed first, keyed second - the keying has to match pickVariation's own
    // rule exactly, and that rule depends on how many variations share a band.
    const parsed: { band: string; sizeOpt?: string; price: number }[] = [];
    for (const v of data) {
      const options: string[] = Array.isArray(v.attributes)
        ? v.attributes
            .map((a: { option?: unknown }) => String(a?.option ?? "").trim())
            .filter(Boolean)
        : [];
      const band = options.find((o) => isBand(o));
      if (!band) continue; // no quantity dimension on this variation - skip it
      const price = Number(v.price);
      if (!Number.isFinite(price) || price <= 0) continue;
      const sizeOpt = options.find((o) => !isBand(o));
      parsed.push({ band, sizeOpt, price });
    }

    const byBand = new Map<string, typeof parsed>();
    for (const p of parsed) {
      const list = byBand.get(p.band) ?? [];
      list.push(p);
      byBand.set(p.band, list);
    }

    const prices = new Map<string, number>();
    for (const [band, list] of byBand) {
      // A single-fill product in Woo's own terms - like pickVariation, the
      // band alone identifies it, whatever its other attribute says (some
      // single-fill products still carry a fixed dose/potency attribute that
      // the storefront never exposes as a choice, e.g. BPC-157 Capsules'
      // "500 MCG"). Keying this under the size-less "::band" form is what
      // getLivePricing looks up for a product with no `sizes` in the static
      // catalog.
      if (list.length === 1) prices.set(`::${band}`, list[0].price);

      // Always also keyed by size, for multi-fill products - and safe to add
      // even in the single-fill case above, since nothing looks it up there.
      for (const p of list) {
        if (p.sizeOpt) prices.set(`${norm(p.sizeOpt)}::${band}`, p.price);
      }
    }
    return prices;
  } catch (e) {
    console.error("[woo] live price lookup threw", slug, e);
    return null;
  }
}

/**
 * A coupon as WooCommerce (WP Admin > Marketing > Coupons) defines it,
 * trimmed to the fields the storefront actually needs to decide whether the
 * code is still good and what it is worth.
 */
export type WooCoupon = {
  id: number;
  code: string;
  /** As entered in Woo: 20 means "20%" for a percent coupon, or "$20" for a fixed one. */
  amount: number;
  discountType: "percent" | "fixed_cart" | "fixed_product" | string;
  dateExpiresGmt: string | null;
  usageLimit: number | null;
  usageCount: number;
  /** Dollars. Woo's own minimum/maximum cart spend condition on the coupon. */
  minimumAmount: number | null;
  maximumAmount: number | null;
  description: string;
};

/** "" and "0" both mean "not set" in Woo's own admin UI for these fields. */
const numberOrNull = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Looks up a coupon by code, live, straight from WooCommerce.
 *
 * Nothing is cached or mirrored locally: the client manages these entirely
 * from WP Admin, and a code created, edited or deleted there needs to take
 * effect on the storefront without a deploy. The lookup happens on every
 * validation attempt (and again, authoritatively, at order placement) rather
 * than trusting whatever the browser last saw.
 */
export async function getWooCoupon(code: string): Promise<WooCoupon | null> {
  if (!isWooConfigured()) return null;
  const trimmed = code.trim();
  if (!trimmed) return null;

  try {
    const res = await fetch(
      `${BASE}/wp-json/wc/v3/coupons?code=${encodeURIComponent(trimmed)}`,
      {
        headers: { Authorization: authHeader() },
        // Never cached - a code the client just retired must stop working
        // immediately, not whenever some CDN or fetch cache decides to expire.
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      }
    );
    if (!res.ok) {
      if (res.status !== 404) console.error("[woo] coupon lookup failed", res.status);
      return null;
    }
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;
    const c = data[0];
    return {
      id: c.id,
      code: String(c.code ?? trimmed).toUpperCase(),
      amount: Number(c.amount) || 0,
      discountType: c.discount_type ?? "percent",
      dateExpiresGmt: c.date_expires_gmt || null,
      // 0 means "no limit" in Woo's own admin UI and in WC_Discounts' own
      // validity check (it only enforces the limit when usage_limit > 0), so
      // this matches that rather than treating 0 as "already exhausted."
      usageLimit: numberOrNull(c.usage_limit),
      usageCount: Number(c.usage_count) || 0,
      // Woo's REST API returns these as the literal string "0" for a coupon
      // with no minimum/maximum spend set - not "" and not null - because
      // that is what an empty "Usage restriction" field saves as. A truthy
      // string check treats "0" as "a limit of $0 is set" and then rejects
      // every real order, so a positive amount is required before either is
      // treated as an actual restriction.
      minimumAmount: numberOrNull(c.minimum_amount),
      maximumAmount: numberOrNull(c.maximum_amount),
      description: String(c.description ?? "").trim(),
    };
  } catch (e) {
    // A WordPress hiccup should reject the code, not crash checkout - same
    // posture as mirrorOrderToWoo below.
    console.error("[woo] coupon lookup threw", e);
    return null;
  }
}

export type WooMirrorInput = {
  orderNumber: string;
  status: string;
  paymentMethod: string;
  email: string;
  phone: string | null;
  notes: string | null;
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  shippingLabel: string;
  shippingCents: number;
  items: {
    slug: string;
    name: string;
    size?: string;
    quantity: number;
    /** List price x quantity, before any quantity break. */
    listCents: number;
    /** What the line actually costs after its quantity break. */
    lineCents: number;
  }[];
  /**
   * Order-level discount only - promo code, payment-method credit - NOT the
   * quantity breaks, which are already expressed as the gap between each
   * line's listCents and lineCents. Sending the full discount here as well
   * subtracts the tier saving twice and understates the order.
   */
  orderDiscountCents: number;
  /** Affiliate attribution, if any. Meta-only - Woo's own totals are untouched;
   *  the commission is tracked in our own database, not deducted here. */
  refCode?: string | null;
  affiliateName?: string | null;
  commissionCents?: number;
};

const dollars = (cents: number) => (cents / 100).toFixed(2);

export async function mirrorOrderToWoo(
  input: WooMirrorInput
): Promise<{ ok: true; wooId: number } | { ok: false; error: string }> {
  if (!isWooConfigured()) return { ok: false, error: "not-configured" };

  const address = {
    first_name: input.firstName,
    last_name: input.lastName,
    address_1: input.address1,
    address_2: input.address2,
    city: input.city,
    state: input.state,
    postcode: input.zip,
    country: "US",
  };

  const body = {
    status: WOO_STATUS[input.status] ?? "pending",
    currency: "USD",
    payment_method: input.paymentMethod,
    payment_method_title: PAYMENT_TITLE[input.paymentMethod] ?? input.paymentMethod,
    // Never true. Payment is confirmed on another system entirely, and marking
    // an order paid here on a guess would put money in their reports that may
    // not exist.
    set_paid: false,
    billing: { ...address, email: input.email, phone: input.phone ?? "" },
    shipping: address,
    customer_note: input.notes ?? "",
    line_items: input.items.map((i) => {
      const product = WOO_PRODUCTS[i.slug];
      const variation = pickVariation(i.slug, i.size, i.quantity);
      return {
        ...(product ? { product_id: product.id } : { name: i.name }),
        ...(variation ? { variation_id: variation.id } : {}),
        quantity: i.quantity,
        // Sent explicitly rather than letting Woo price the line. Their
        // catalogue prices have already drifted from ours (KLOW moved to $195
        // here and is still $175 there), and the order must record what the
        // customer was actually charged, not what Woo would have charged.
        //
        // subtotal is the pre-discount figure and total the post-discount one,
        // which is Woo's own convention: the quantity break shows up as the
        // gap between them, exactly where their reports expect to find it.
        subtotal: dollars(i.listCents),
        total: dollars(i.lineCents),
      };
    }),
    shipping_lines: [
      {
        method_id: "flat_rate",
        method_title: input.shippingLabel,
        total: dollars(input.shippingCents),
      },
    ],
    ...(input.orderDiscountCents > 0
      ? {
          fee_lines: [
            {
              name: "Discount",
              total: `-${dollars(input.orderDiscountCents)}`,
              tax_status: "none",
            },
          ],
        }
      : {}),
    meta_data: [
      // The join key. Written so a human reading the Woo order can trace it
      // back, and so a future reconciliation job can find orders that were
      // already mirrored instead of creating them twice.
      { key: "_ubl_order_number", value: input.orderNumber },
      { key: "_ubl_source", value: "storefront" },
      ...(input.refCode
        ? [
            { key: "_ubl_affiliate_code", value: input.refCode },
            { key: "_ubl_affiliate_name", value: input.affiliateName ?? "" },
            { key: "_ubl_commission", value: dollars(input.commissionCents ?? 0) },
          ]
        : []),
    ],
  };

  try {
    const res = await fetch(`${BASE}/wp-json/wc/v3/orders`, {
      method: "POST",
      headers: { Authorization: authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // A slow WordPress must not hold the customer on a spinner.
      signal: AbortSignal.timeout(15_000),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[woo] create failed", res.status, data?.message ?? data);
      return { ok: false, error: data?.message ?? `http-${res.status}` };
    }
    return { ok: true, wooId: data.id };
  } catch (e) {
    console.error("[woo] create threw", e);
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

/** Pushes a status change from our dashboard through to WooCommerce. */
export async function updateWooStatus(
  wooId: number,
  status: string
): Promise<boolean> {
  if (!isWooConfigured()) return false;
  const wooStatus = WOO_STATUS[status];
  if (!wooStatus) return false;

  try {
    const res = await fetch(`${BASE}/wp-json/wc/v3/orders/${wooId}`, {
      method: "PUT",
      headers: { Authorization: authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ status: wooStatus }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) console.error("[woo] status update failed", res.status);
    return res.ok;
  } catch (e) {
    console.error("[woo] status update threw", e);
    return false;
  }
}
