import type { Product } from "@/data/types";
import { stackDiscount, tiersFor, unitPriceAt } from "./pricing";
import { resolveDiscount, type ResolvedDiscount } from "./promo";
import { SHIPPING_THRESHOLD, shippingMethod, type ShippingMethodId } from "./config";

/**
 * The single place order money is calculated.
 *
 * The cart, the checkout page and the order route each used to do this
 * arithmetic themselves. Three copies of a discount rule is how a cap gets
 * bypassed: the browser shows one number, the charge is another, and nobody
 * notices until a margin report does. Everything now goes through
 * `computeTotals`, and the routes recompute it server-side from slugs so a
 * tampered cart still cannot set its own price.
 */

/**
 * Hard ceiling on percentage discounts, as a fraction of list value.
 *
 * Client instruction: nobody should ever get more than 25% off. Without this,
 * discounts compound - a 5-unit order takes the 10% quantity price, then 25%
 * off that from the first-order code, then $5 for paying by Zelle, and lands
 * at 33.6% off list.
 *
 * Scope: this caps money off product (quantity tiers + bundle/promo + the
 * payment-method credit). Free shipping and the free bacteriostatic water are
 * order incentives rather than a percentage off goods, and are deliberately
 * outside the cap - otherwise unlocking the $250 reward would silently claw
 * back part of the customer's coupon.
 */
export const MAX_DISCOUNT_RATE = 0.25;

/** Order-value rewards, cheapest first. Drives the cart's progress ladder. */
export const REWARDS = [
  { threshold: SHIPPING_THRESHOLD, id: "free-shipping", label: "Free standard shipping" },
  { threshold: 250, id: "free-bac", label: "Free BAC Water" },
  { threshold: 400, id: "free-expedited", label: "Free expedited shipping" },
] as const;

export type RewardId = (typeof REWARDS)[number]["id"];

/** The SKU given away at the $250 tier. */
export const FREE_BAC_SLUG = "bac-water-hospira-brand";

export type CartLine = { product: Product; qty: number; size?: string };

export type TotalsInput = {
  items: CartLine[];
  /**
   * The resolved discount rate for whatever code is applied - a fraction of
   * the discountable subtotal, already looked up. This calculator does not
   * care whether the rate came from the built-in first-order code or a
   * WooCommerce coupon (see lib/promo-resolve.ts): by the time it gets here,
   * that lookup is done and the only thing that matters is the number, so
   * the same arithmetic and the same 25% cap apply no matter the source.
   */
  promoRate?: number;
  shippingMethodId?: ShippingMethodId;
  /** Flat credit for paying by transfer. */
  methodDiscount?: number;
};

/**
 * The subtotal a promo code's rate (or minimum/maximum spend condition)
 * is measured against: quantity-tier prices, supplies excluded.
 *
 * Shared with the promo resolver so a coupon's WooCommerce minimum/maximum
 * spend is checked against the exact figure the discount itself will be
 * calculated from, rather than a second, slightly different subtotal.
 */
export function discountableSubtotal(items: CartLine[]): number {
  return items
    .filter((i) => i.product.format !== "supply")
    .reduce((s, i) => s + unitPriceAt(i.product, i.qty, i.size) * i.qty, 0);
}

export type Totals = {
  /** What the goods would cost with no discount of any kind. */
  listSubtotal: number;
  /** What the goods cost at the quantity prices actually shown. */
  subtotal: number;
  /** Saving from quantity tiers alone. */
  tierSavings: number;
  /** Saving from the bundle ladder or a promo code, never both. */
  rateDiscount: number;
  /** Credit for the free bacteriostatic water, once unlocked. */
  freeItemCredit: number;
  methodDiscount: number;
  /** Everything above that counts toward the cap, after clamping. */
  totalDiscount: number;
  /** True when the cap actually bit. */
  capped: boolean;
  shipping: number;
  total: number;
  distinctCompounds: number;
  discountRate: number;
  resolved: ResolvedDiscount;
  unlocked: Record<RewardId, boolean>;
  /** Spend still needed for the next reward, or null when all are unlocked. */
  nextReward: { label: string; remaining: number; threshold: number } | null;
};

/** Single-unit list price for the chosen fill, before any quantity break. */
export const listUnitPrice = (p: Product, size?: string) =>
  tiersFor(p, size)[0]?.unitPrice ?? p.basePrice;

export function computeTotals({
  items,
  promoRate,
  shippingMethodId = "standard",
  methodDiscount: methodCredit = 0,
}: TotalsInput): Totals {
  const isSupply = (p: Product) => p.format === "supply";

  const listSubtotal = items.reduce(
    (s, i) => s + listUnitPrice(i.product, i.size) * i.qty,
    0
  );
  const subtotal = items.reduce(
    (s, i) => s + unitPriceAt(i.product, i.qty, i.size) * i.qty,
    0
  );
  const tierSavings = +(listSubtotal - subtotal).toFixed(2);

  // Distinct COMPOUNDS, so three BAC waters never trigger a bundle discount.
  const distinctCompounds = new Set(
    items.filter((i) => !isSupply(i.product)).map((i) => i.product.slug)
  ).size;

  const bundleRate = stackDiscount(distinctCompounds);
  const resolved = resolveDiscount(promoRate ?? 0, bundleRate);

  // Supplies are excluded from the discountable base as well as the count.
  const discountable = discountableSubtotal(items);
  const rateDiscount = +(discountable * resolved.rate).toFixed(2);

  // Reward thresholds are measured on what the customer actually pays for
  // goods, so a discount cannot bootstrap itself into a bigger reward.
  const afterProductDiscounts = subtotal - rateDiscount;
  const unlocked = Object.fromEntries(
    REWARDS.map((r) => [r.id, afterProductDiscounts >= r.threshold])
  ) as Record<RewardId, boolean>;

  // The free water is credited only against water actually in the cart.
  const bacLine = items.find((i) => i.product.slug === FREE_BAC_SLUG);
  const freeItemCredit =
    unlocked["free-bac"] && bacLine
      ? +listUnitPrice(bacLine.product, bacLine.size).toFixed(2)
      : 0;

  // --- the cap ---------------------------------------------------------
  const listDiscountable = items
    .filter((i) => !isSupply(i.product))
    .reduce((s, i) => s + listUnitPrice(i.product, i.size) * i.qty, 0);

  const rawProductDiscount = tierSavings + rateDiscount + methodCredit;
  const ceiling = +(listDiscountable * MAX_DISCOUNT_RATE).toFixed(2);
  const cappedProductDiscount = Math.min(rawProductDiscount, ceiling);
  const capped = rawProductDiscount > ceiling + 0.001;

  const totalDiscount = +(cappedProductDiscount + freeItemCredit).toFixed(2);

  // --- shipping --------------------------------------------------------
  const ship = shippingMethod(shippingMethodId);
  let shipping = ship.price;
  if (ship.id === "standard" && unlocked["free-shipping"]) shipping = 0;
  if (ship.id === "expedited" && unlocked["free-expedited"]) shipping = 0;
  if (!items.length) shipping = 0;

  const total = +Math.max(0, listSubtotal - totalDiscount + shipping).toFixed(2);

  const next = REWARDS.find((r) => !unlocked[r.id]);
  return {
    listSubtotal: +listSubtotal.toFixed(2),
    subtotal: +subtotal.toFixed(2),
    tierSavings,
    rateDiscount,
    freeItemCredit,
    methodDiscount: methodCredit,
    totalDiscount,
    capped,
    shipping,
    total,
    distinctCompounds,
    discountRate: resolved.rate,
    resolved,
    unlocked,
    nextReward: next
      ? {
          label: next.label,
          threshold: next.threshold,
          remaining: +Math.max(0, next.threshold - afterProductDiscounts).toFixed(2),
        }
      : null,
  };
}
