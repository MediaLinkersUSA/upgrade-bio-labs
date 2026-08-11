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
 * Picks the variation matching a line's fill and quantity.
 *
 * Their variations carry two attributes - the fill ("10 MG") and a quantity
 * band ("1-2", "3-5", "5+") - and the band is identified by shape rather than
 * position, because attribute order is not guaranteed by the API.
 *
 * Returns undefined rather than guessing when nothing matches: a wrong
 * variation silently decrements the wrong stock, which is worse than a line
 * with no variation attached.
 */
function pickVariation(slug: string, size: string | undefined, qty: number) {
  const product = WOO_PRODUCTS[slug];
  if (!product?.variations.length) return undefined;

  const band = qty >= 5 ? "5+" : qty >= 3 ? "3-5" : "1-2";
  const isBand = (o: string) => /^\d+(-\d+|\+)$/.test(o.trim());

  // ALL whitespace is stripped, not merely collapsed. Our labels are written
  // "20mg" and theirs "20 MG"; collapsing spaces leaves "20mg" against "20 mg"
  // and the two never match, which silently selects the wrong fill's variation
  // and decrements the wrong stock.
  const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();

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
