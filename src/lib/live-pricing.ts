import "server-only";
import type { Product, Tier } from "@/data/types";
import { getLiveUnitPrices, getLiveStockStatus, bandForQty, normalizeOption } from "./woocommerce";
import { applyLivePricing, type LivePricing } from "./apply-live-pricing";

function repriceTiers(tiers: Tier[], sizeKey: string, live: Map<string, number>): Tier[] {
  return tiers.map((t) => {
    const price = live.get(`${sizeKey}::${bandForQty(t.minQty)}`);
    return price != null ? { ...t, unitPrice: price } : t;
  });
}

/**
 * Live pricing for one product, straight from WooCommerce.
 *
 * Walks the product's OWN tiers/sizes - never invents a tier or a size that
 * is not already defined in data/products.ts - and swaps in a live unit
 * price wherever a matching WooCommerce variation has one. A tier with no
 * live match keeps its existing static price rather than being dropped or
 * shown as $0.
 *
 * Returns null when WooCommerce is unreachable, unconfigured, or nothing on
 * this product matched at all - callers fall back to the static prices already
 * in data/products.ts, exactly like every other Woo integration in this app.
 */
export async function getLivePricing(product: Product): Promise<LivePricing | null> {
  // Fetched in parallel and merged independently: stock lives on the parent
  // product and has no dependency on the quantity-band variation structure
  // pricing needs, so a product with "malformed" price variations (see
  // getLiveUnitPrices) can still get a correct live stock status, and vice
  // versa. Only when NEITHER resolves does the caller fall back entirely to
  // the static catalog.
  const [live, liveStock] = await Promise.all([
    getLiveUnitPrices(product.slug),
    getLiveStockStatus(product.slug),
  ]);

  const hasPricing = Boolean(live && live.size);
  if (!hasPricing && liveStock === null) return null;

  const tiers = hasPricing ? repriceTiers(product.tiers, "", live!) : product.tiers;

  const sizeTiers: Record<string, Tier[]> = {};
  if (hasPricing) {
    for (const s of product.sizes ?? []) {
      if (s.tiers?.length) sizeTiers[s.label] = repriceTiers(s.tiers, normalizeOption(s.label), live!);
    }
  }

  return {
    basePrice: tiers[0]?.unitPrice ?? product.basePrice,
    tiers,
    sizeTiers: Object.keys(sizeTiers).length ? sizeTiers : undefined,
    inStock: liveStock ?? undefined,
  };
}

/** `product`, with live WooCommerce prices applied wherever one was found. */
export async function withLivePricing(product: Product): Promise<Product> {
  return applyLivePricing(product, await getLivePricing(product));
}

/**
 * `products`, each with live WooCommerce prices applied wherever one was
 * found - for a whole page (the shop grid, a related-products row) rather
 * than a single PDP. Built on getLivePricingForSlugs so it shares the same
 * one-fetch-per-product-in-parallel behaviour, not a serial loop.
 */
export async function withLivePricingForAll(products: Product[]): Promise<Product[]> {
  const live = await getLivePricingForSlugs(products);
  return products.map((p) => applyLivePricing(p, live[p.slug]));
}

/**
 * Live pricing for several products at once - what /api/live-price serves,
 * what the order route uses to reprice a whole cart before it charges
 * anyone, and what the shop grid and a product page's cross-sell candidates
 * use to live-price many products together.
 *
 * Fetched in bounded batches, not one giant Promise.all over the whole
 * list: firing every product's 2 WooCommerce requests simultaneously - up
 * to 130 at once for the full ~65-product catalog - was enough concurrent
 * load to make WordPress itself the bottleneck, serializing behind its own
 * PHP worker pool and dragging every page's load time out toward the
 * per-request timeout. BATCH_SIZE trades a bit of total wall time for
 * keeping WooCommerce responsive under a realistic concurrent load.
 */
const BATCH_SIZE = 10;

export async function getLivePricingForSlugs(
  products: Product[]
): Promise<Record<string, LivePricing>> {
  const out: Record<string, LivePricing> = {};
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const entries = await Promise.all(
      batch.map(async (p) => [p.slug, await getLivePricing(p)] as const)
    );
    for (const [slug, live] of entries) if (live) out[slug] = live;
  }
  return out;
}
