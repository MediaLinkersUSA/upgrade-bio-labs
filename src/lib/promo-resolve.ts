import "server-only";
import { findPromo } from "./promo";
import { getWooCoupon } from "./woocommerce";

/**
 * Turns whatever the customer typed into a single applicable discount rate.
 *
 * Two sources, checked in order:
 *  1. The built-in codes in lib/promo.ts (currently just LAB10, the 25%
 *     first-order code) - these carry bespoke rules (the device cookie, the
 *     email check against past customers) that live outside WooCommerce.
 *  2. WooCommerce's own coupons (WP Admin > Marketing > Coupons), looked up
 *     live so the client can create and retire codes without a deploy.
 *
 * This must run server-side only: it is the one place both sources are
 * trusted, which is why it is never imported from a client component. The
 * cart validates through the /api/promo/validate route, and the order route
 * re-resolves the same code again before it ever prices an order.
 */

export type ResolvedPromo = {
  code: string;
  /** Fraction off the discountable subtotal. */
  rate: number;
  label: string;
  firstOrderOnly?: boolean;
  source: "local" | "woo";
};

export type PromoResolution =
  | { ok: true; promo: ResolvedPromo }
  | { ok: false; reason: string; message: string };

const money = (n: number) => `$${n.toFixed(2)}`;

export async function resolvePromoCode(
  input: string | null | undefined,
  opts: { subtotalCents?: number } = {}
): Promise<PromoResolution> {
  const local = findPromo(input);
  if (local) {
    return {
      ok: true,
      promo: {
        code: local.code,
        rate: local.rate,
        label: local.label,
        firstOrderOnly: local.firstOrderOnly,
        source: "local",
      },
    };
  }

  const trimmed = String(input ?? "").trim();
  if (!trimmed) {
    return { ok: false, reason: "unknown", message: "Enter a discount code." };
  }

  const coupon = await getWooCoupon(trimmed);
  if (!coupon) {
    return {
      ok: false,
      reason: "unknown",
      message: "That discount code is not recognized. Check the spelling and try again.",
    };
  }

  if (coupon.dateExpiresGmt && new Date(`${coupon.dateExpiresGmt}Z`).getTime() < Date.now()) {
    return { ok: false, reason: "expired", message: "That discount code has expired." };
  }

  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    return {
      ok: false,
      reason: "exhausted",
      message: "That discount code has reached its usage limit.",
    };
  }

  const subtotal = (opts.subtotalCents ?? 0) / 100;

  if (coupon.minimumAmount !== null && subtotal < coupon.minimumAmount) {
    return {
      ok: false,
      reason: "below-minimum",
      message: `This code needs an order of at least ${money(coupon.minimumAmount)}.`,
    };
  }
  if (coupon.maximumAmount !== null && subtotal > coupon.maximumAmount) {
    return {
      ok: false,
      reason: "above-maximum",
      message: `This code only applies to orders up to ${money(coupon.maximumAmount)}.`,
    };
  }

  if (coupon.discountType === "percent") {
    const rate = Math.max(0, Math.min(1, coupon.amount / 100));
    return {
      ok: true,
      promo: {
        code: coupon.code,
        rate,
        label: coupon.description || `${coupon.amount}% off`,
        source: "woo",
      },
    };
  }

  // A fixed-dollar coupon only converts to a rate once we know what it is a
  // fraction of, and a $0 or unknown subtotal (e.g. an empty cart) makes that
  // undefined rather than 0 - reject instead of guessing.
  if (coupon.discountType === "fixed_cart" && subtotal > 0) {
    const rate = Math.max(0, Math.min(1, coupon.amount / subtotal));
    return {
      ok: true,
      promo: {
        code: coupon.code,
        rate,
        label: coupon.description || `${money(coupon.amount)} off`,
        source: "woo",
      },
    };
  }

  // fixed_product coupons target specific line items, which this store's
  // single-rate discount model has no way to express. Rejected with a clear
  // reason rather than silently under- or over-discounting the order.
  return {
    ok: false,
    reason: "unsupported",
    message: "That discount code isn't supported at checkout yet. Please contact us.",
  };
}
