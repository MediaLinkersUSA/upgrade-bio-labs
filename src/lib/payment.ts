/**
 * Handoff to the external payment site.
 *
 * This storefront deliberately does NOT process payments. Cards are handled by
 * the WordPress property at upgradebiolabservices.com running UBL Stripe
 * Connect Pro, which owns the Stripe account, the keys and the PCI surface.
 * Our job stops at recording the order and sending the customer there with its
 * id; theirs is to take the money and send the customer back.
 *
 * Both ends are environment-driven so the payment host can move, or be pointed
 * at a staging copy, without a code change.
 */

/** Where the customer goes to pay. The order id is appended as `order_id`. */
export const PAYMENT_BASE_URL =
  process.env.NEXT_PUBLIC_PAYMENT_URL ??
  "https://upgradebiolabservices.com/strip-payment/";

/**
 * Where the payment site sends the customer afterwards.
 *
 * Derived from the request rather than hardcoded, because this site answers on
 * two names: bioupgradelabs.vercel.app today and upgradebiolabs.com after
 * cutover. A fixed return address would send everyone testing the Vercel
 * domain to the old WordPress site, and a fixed Vercel address would have to
 * be remembered and changed on the day the domain moves. Reading the origin
 * off the request is right on both, on every preview deployment, and on
 * localhost, with no switch to throw.
 *
 * The env vars still win when set, for pointing at a staging pair by hand.
 */
const RETURN_PATH = "/thank-you";
const CANCEL_PATH = "/checkout";

const FALLBACK_ORIGIN = "https://upgradebiolabs.com";

function returnUrls(origin?: string | null) {
  const base = (origin ?? FALLBACK_ORIGIN).replace(/\/$/, "");
  return {
    success: process.env.NEXT_PUBLIC_PAYMENT_RETURN_URL ?? `${base}${RETURN_PATH}`,
    cancel: process.env.NEXT_PUBLIC_PAYMENT_CANCEL_URL ?? `${base}${CANCEL_PATH}`,
  };
}

/**
 * The origin to send the customer back to, read off the incoming request.
 *
 * `origin` is set on the fetch from our own checkout form. `host` is the
 * fallback, and is trusted only as far as it needs to be: the worst a forged
 * Host header achieves is sending the forger themselves somewhere else after
 * their own payment. It cannot touch the order, the amount, or anyone else.
 */
export function originFromRequest(req: Request): string {
  const origin = req.headers.get("origin");
  if (origin) return origin;
  const host = req.headers.get("host");
  if (host) return `https://${host}`;
  return FALLBACK_ORIGIN;
}

/**
 * Builds the payment URL for an order.
 *
 * Four parameters, all read by the UBL Stripe plugin:
 *
 * - `order_id`   the row id, echoed back to us on return and posted to their
 *                Stripe endpoint so the charge is traceable to an order.
 * - `amount`     the total, in dollars. Their amount field renders empty and
 *                is typed by the customer, so without this an $80 order can be
 *                paid with $1. Passing it means the field arrives correct.
 * - `return_url` / `cancel_url` where to send the customer either way, so the
 *                payment site does not have to hardcode our addresses.
 *
 * The amount here is a convenience, not the authority. It rides in a URL the
 * customer can edit, and their field stays editable regardless. The real fix
 * is the order-details endpoint (see app/wp-json/.../order-details), which the
 * plugin prefers and which reads the total from our database - but that only
 * engages once upgradebiolabs.com points at this site, because the plugin
 * hardcodes that domain as its lookup host. Until then, this is what makes the
 * amount right.
 */
export function paymentUrlFor(
  orderId: string,
  totalCents: number,
  origin?: string | null
): string {
  const { success, cancel } = returnUrls(origin);
  const url = new URL(PAYMENT_BASE_URL);
  url.searchParams.set("order_id", orderId);
  url.searchParams.set("amount", (totalCents / 100).toFixed(2));
  url.searchParams.set("return_url", success);
  url.searchParams.set("cancel_url", cancel);
  return url.toString();
}
