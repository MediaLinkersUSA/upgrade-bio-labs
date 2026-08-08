/**
 * Promotion codes and how they interact with the site's other savings.
 *
 * There are three separate discounts on this store and they are NOT all
 * equivalent:
 *
 *  1. Quantity tiers  - baked into each product's unit price at 3 and 5 units.
 *                       These always apply. The client is happy for a coupon
 *                       to sit on top of them.
 *  2. Bundle discount - 15% for two distinct compounds, 20% for three.
 *  3. Promo codes     - the 25% first-order code from the email capture.
 *
 * (2) and (3) are mutually exclusive by client instruction: a first-time buyer
 * gets 25% OR the bundle rate, never 25% + 20% on top of each other. The
 * larger of the two wins, so entering a valid code can never leave a customer
 * worse off than not entering one - which is the behavior that generates
 * support tickets.
 */

export type Promo = {
  code: string;
  /** Fraction off the discountable subtotal. */
  rate: number;
  label: string;
  /** Restricted to a customer's first order. Verified server-side at
   *  checkout, since that is the first point the email is known. */
  firstOrderOnly?: boolean;
};

/**
 * The live codes. `code` is compared case-insensitively and trimmed, because
 * customers paste them with stray whitespace and in whatever case they like.
 */
const PROMOS: Promo[] = [
  { code: "LAB10", rate: 0.25, label: "First order, 25% off", firstOrderOnly: true },
];

export function findPromo(input: string | null | undefined): Promo | null {
  if (!input) return null;
  const needle = String(input).trim().toUpperCase();
  return PROMOS.find((p) => p.code === needle) ?? null;
}

export type ResolvedDiscount = {
  /** The rate actually applied to the discountable subtotal. */
  rate: number;
  source: "none" | "promo" | "bundle";
  /** Set when a valid code was entered but the bundle rate was better. */
  supersededPromo: boolean;
  /** Set when a code is applied and bundle savings were given up for it. */
  supersededBundle: boolean;
};

/**
 * Picks the single discount that applies. Never sums the two.
 *
 * Both callers - the cart and the checkout route - go through this, so the
 * price the customer is quoted and the price recorded on the order cannot drift.
 */
export function resolveDiscount(
  promoRate: number,
  bundleRate: number
): ResolvedDiscount {
  if (promoRate <= 0 && bundleRate <= 0) {
    return { rate: 0, source: "none", supersededPromo: false, supersededBundle: false };
  }
  if (promoRate >= bundleRate) {
    return {
      rate: promoRate,
      source: "promo",
      supersededPromo: false,
      supersededBundle: bundleRate > 0,
    };
  }
  return {
    rate: bundleRate,
    source: "bundle",
    supersededPromo: promoRate > 0,
    supersededBundle: false,
  };
}
