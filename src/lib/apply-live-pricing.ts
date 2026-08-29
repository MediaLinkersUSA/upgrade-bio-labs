import type { Product, Tier } from "@/data/types";

/**
 * Just the pricing-relevant slice of a Product - what /api/live-price
 * returns, and what a live WooCommerce lookup produces server-side.
 *
 * `sizeTiers` is keyed by the size's own label (e.g. "20mg"), tiers only -
 * it gets re-attached to that size's existing metadata (doseMg, doseLabel,
 * ...) rather than replacing the size object outright.
 */
export type LivePricing = {
  basePrice: number;
  tiers: Tier[];
  sizeTiers?: Record<string, Tier[]>;
  /** Absent (not fetched, or the fetch failed) leaves the static inStock in
   *  data/products.ts untouched - only a confirmed instock/outofstock value
   *  from WooCommerce overrides it. */
  inStock?: boolean;
};

/**
 * Overlays live prices onto a static Product. Only `basePrice`, `tiers`, and
 * each size's `tiers` change - name, stock, images, dose labels, which sizes
 * exist at all, stay exactly as authored in data/products.ts. `live` being
 * absent (WooCommerce unreachable, unconfigured, or nothing matched) just
 * returns the product unchanged, so a WordPress hiccup degrades to "shows
 * the last-known static price" rather than breaking the page.
 *
 * Used both server-side (lib/live-pricing.ts, before the order route prices
 * a charge) and client-side (after a page's live fetch resolves), so "what
 * the customer sees" and "what they are charged" run through the identical
 * merge logic.
 */
export function applyLivePricing(product: Product, live: LivePricing | null | undefined): Product {
  if (!live) return product;
  const sizes = product.sizes?.map((s) => {
    const liveTiers = live.sizeTiers?.[s.label];
    return liveTiers && liveTiers.length ? { ...s, tiers: liveTiers } : s;
  });
  return {
    ...product,
    tiers: live.tiers,
    sizes,
    basePrice: live.basePrice,
    inStock: live.inStock ?? product.inStock,
  };
}
