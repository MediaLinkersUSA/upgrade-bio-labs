import { NextResponse } from "next/server";
import { getProduct } from "@/data/products";
import { unitPriceAt } from "@/lib/pricing";
import { computeTotals, discountableSubtotal, listUnitPrice } from "@/lib/totals";
import { resolvePromoCode } from "@/lib/promo-resolve";
import { withLivePricing } from "@/lib/live-pricing";
import {
  checkFirstOrderEligibility,
  recordRedemption,
  FIRST_ORDER_COOKIE,
  FIRST_ORDER_COOKIE_MAX_AGE,
} from "@/lib/first-order";
import { cookies } from "next/headers";
import { paymentMethod, generateOrderNumber } from "@/lib/checkout";
import { shippingMethod } from "@/lib/config";
import { isSupabaseConfigured } from "@/lib/supabase";
import { createOrder, recordWooId } from "@/lib/order-store";
import { paymentUrlFor, originFromRequest } from "@/lib/payment";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { mirrorOrderToWoo } from "@/lib/woocommerce";
import { REF_COOKIE, findAffiliate, computeCommissionCents } from "@/lib/affiliates";

/**
 * Creates an order. This is the only way an order comes into existence.
 *
 * No money moves here, whatever the method. Card orders are recorded and the
 * customer is handed to the external payment site with the new row's id; Zelle
 * and CashApp orders are recorded and settled by hand. So the response is the
 * same shape either way, plus a paymentUrl when there is somewhere to send
 * them.
 *
 * Every figure is recomputed from the local catalog. The browser sends slugs,
 * quantities, a size label and a promo code - never money - because the total
 * this route writes is the total the customer will be asked to pay on another
 * domain, and nothing downstream re-checks it.
 */

const cents = (n: number) => Math.round(n * 100);

export async function POST(req: Request) {
  // An unauthenticated write endpoint. Throttled so it cannot be used to fill
  // the client's orders table with junk.
  const gate = rateLimit(`orders:${clientIp(req)}`, 12, 10 * 60 * 1000);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many orders placed. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfter) } }
    );
  }

  let body: {
    lines?: { slug: string; qty: number; size?: string }[];
    promoCode?: string;
    paymentMethod?: string;
    shippingMethod?: string;
    customer?: Record<string, string>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const method = paymentMethod(String(body.paymentMethod ?? ""));

  const c = body.customer ?? {};
  const required = ["firstName", "lastName", "address1", "city", "state", "zip", "email"];
  const missing = required.filter((k) => !String(c[k] ?? "").trim());
  if (missing.length) {
    return NextResponse.json({ error: "Missing required details." }, { status: 422 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(c.email))) {
    return NextResponse.json({ error: "That email address looks wrong." }, { status: 422 });
  }

  const staticItems = (Array.isArray(body.lines) ? body.lines : [])
    .map((l) => {
      const p = getProduct(String(l.slug));
      const qty = Math.max(1, Math.min(99, Math.floor(Number(l.qty) || 0)));
      if (!p || !p.inStock) return null;
      const size =
        typeof l.size === "string" &&
        p.sizes?.some((s) => s.label === l.size && s.tiers?.length)
          ? l.size
          : undefined;
      return { product: p, qty, size };
    })
    .filter(Boolean) as { product: NonNullable<ReturnType<typeof getProduct>>; qty: number; size?: string }[];

  if (!staticItems.length) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 422 });
  }

  // Repriced from WooCommerce, live, right before this order is priced -
  // never from whatever the browser last displayed. The product/shop pages
  // fetch live prices client-side after they render (see lib/live-pricing.ts
  // and /api/live-price), which keeps them fast and decoupled from
  // WordPress; this is the one place that actually has to be right, so it
  // does the equivalent lookup itself rather than trusting that round trip.
  const items = await Promise.all(
    staticItems.map(async (i) => {
      const product = await withLivePricing(i.product);
      return { ...i, product, unit: unitPriceAt(product, i.qty, i.size) };
    })
  );

  // Discount codes are re-resolved here rather than trusted from the client -
  // this is the same rule the rest of the route follows for money. Covers
  // both the built-in first-order code and a live WooCommerce coupon lookup
  // (lib/promo-resolve.ts), so a code retired in WP Admin mid-checkout still
  // cannot price an order.
  const subtotalCents = Math.round(discountableSubtotal(items) * 100);
  const resolvedPromo = await resolvePromoCode(body.promoCode, { subtotalCents });
  const requested = resolvedPromo.ok ? resolvedPromo.promo : null;
  let promoRate = requested?.rate ?? 0;
  let promoRejected: string | null = null;
  const jar = await cookies();
  const deviceUsed = !!jar.get(FIRST_ORDER_COOKIE)?.value;
  if (requested?.firstOrderOnly) {
    const check = await checkFirstOrderEligibility(String(c.email), deviceUsed);
    if (!check.eligible) {
      promoRate = 0;
      promoRejected = check.reason;
    }
  }

  // Same calculator as the cart, so the 25% cap and the reward thresholds
  // apply identically however the customer pays.
  const totals = computeTotals({
    items,
    promoRate,
    shippingMethodId: String(body.shippingMethod ?? "standard") as never,
    methodDiscount: method.discount,
  });
  const ship = shippingMethod(String(body.shippingMethod ?? "standard"));

  // Affiliate attribution, if the visit that led here carried ?ref=. Looked
  // up here rather than trusted from the cookie value alone, so an inactive
  // or made-up code simply credits nobody instead of recording a commission
  // against an affiliate that does not exist.
  const refCode = jar.get(REF_COOKIE)?.value ?? null;
  const affiliate = await findAffiliate(refCode);
  const commissionCents = affiliate
    ? computeCommissionCents(cents(totals.total), cents(totals.shipping), affiliate.commissionBps)
    : 0;

  const orderNumber = generateOrderNumber();

  if (!isSupabaseConfigured()) {
    // Without a database the order would vanish - and on a card order the
    // payment site is handed nothing but the row id, so there would be
    // literally nothing to pay for.
    return NextResponse.json(
      { error: "Orders are not available right now. Please contact us to order." },
      { status: 503 }
    );
  }

  // Adapts to whichever schema the database currently has - see order-store.
  const saved = await createOrder({
    orderNumber,
    paymentMethod: method.id,
    // A card order is on its way to the payment site; a transfer is waiting on
    // a human. Neither is paid, and neither is marked so until something
    // server-to-server says it is.
    status: method.instant ? "pending_payment" : "awaiting_payment",
    email: String(c.email).trim().toLowerCase(),
    phone: String(c.phone ?? "").trim() || null,
    notes:
      [String(c.notes ?? "").trim(), `Shipping: ${ship.label} (${ship.eta})`]
        .filter(Boolean)
        .join(" | ") || null,
    shippingName: `${c.firstName} ${c.lastName}`.trim(),
    shippingAddress: {
      line1: String(c.address1 ?? ""),
      line2: String(c.address2 ?? ""),
      city: String(c.city ?? ""),
      state: String(c.state ?? ""),
      postal_code: String(c.zip ?? ""),
      country: "US",
    },
    subtotalCents: cents(totals.listSubtotal),
    discountCents: cents(totals.totalDiscount),
    shippingCents: cents(totals.shipping),
    totalCents: cents(totals.total),
    distinctCompounds: totals.distinctCompounds,
    discountRate: totals.discountRate,
    refCode: affiliate?.code ?? null,
    affiliateId: affiliate?.id ?? null,
    commissionCents,
    items: items.map((i) => ({
      slug: i.product.slug,
      name: i.product.name,
      format: i.product.format,
      size: i.size,
      quantity: i.qty,
      unitCents: cents(i.unit),
      lineCents: cents(i.unit * i.qty),
    })),
  });

  if (!saved.ok) {
    return NextResponse.json(
      { error: "We could not record that order. Please contact us." },
      { status: 500 }
    );
  }

  // Mirror into WooCommerce, where ShipStation, UPS Labels and UBL Invoices
  // pick orders up. Awaited so a mirror failure is logged against the request
  // that caused it, but its result is deliberately ignored: the order is
  // already recorded above, and a WordPress outage must not cost the sale.
  const mirrored = await mirrorOrderToWoo({
    orderNumber,
    status: method.instant ? "pending_payment" : "awaiting_payment",
    paymentMethod: method.id,
    email: String(c.email).trim().toLowerCase(),
    phone: String(c.phone ?? "").trim() || null,
    notes: String(c.notes ?? "").trim() || null,
    firstName: String(c.firstName ?? ""),
    lastName: String(c.lastName ?? ""),
    address1: String(c.address1 ?? ""),
    address2: String(c.address2 ?? ""),
    city: String(c.city ?? ""),
    state: String(c.state ?? ""),
    zip: String(c.zip ?? ""),
    shippingLabel: `${ship.label} (${ship.eta})`,
    shippingCents: cents(totals.shipping),
    // Tier savings are carried per line; only the order-level portion of the
    // discount becomes a fee line, or it would be subtracted twice.
    orderDiscountCents: cents(totals.totalDiscount - totals.tierSavings),
    refCode: affiliate?.code ?? null,
    affiliateName: affiliate?.name ?? null,
    commissionCents,
    items: items.map((i) => ({
      slug: i.product.slug,
      name: i.product.name,
      size: i.size,
      quantity: i.qty,
      listCents: cents(listUnitPrice(i.product, i.size) * i.qty),
      lineCents: cents(i.unit * i.qty),
    })),
  });

  if (mirrored.ok) {
    await recordWooId(saved.id, mirrored.wooId);
  } else {
    // Left for reconciliation rather than retried inline - the customer is
    // waiting, and a WordPress that just timed out will time out again.
    console.error(`[orders] ${orderNumber} not mirrored:`, mirrored.error);
  }

  const res = NextResponse.json({
    orderId: saved.id,
    orderNumber,
    total: totals.total,
    promoRejected,
    // Only card orders have somewhere to be sent. The id in this URL is the
    // database id, which is what the payment site looks the order up by, and
    // the amount is the total computed above - never a figure from the client.
    paymentUrl: method.instant
      ? paymentUrlFor(saved.id, cents(totals.total), originFromRequest(req))
      : null,
  });

  if (requested?.firstOrderOnly && !promoRejected) {
    await recordRedemption(String(c.email), requested.code, orderNumber);
    // The device is now spent.
    res.cookies.set(FIRST_ORDER_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: FIRST_ORDER_COOKIE_MAX_AGE,
    });
  }
  return res;
}
