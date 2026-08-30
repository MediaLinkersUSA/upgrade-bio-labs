import type { Product } from "@/data/types";
import { products } from "@/data/products";
import { getSupabaseAdmin } from "./supabase";
import { getLivePricingForSlugs } from "./live-pricing";
import { applyLivePricing, type LivePricing } from "./apply-live-pricing";

/**
 * Pulls live price/stock for the whole catalog from WooCommerce and writes
 * it into price_cache. This is the ONLY place in the app that still fetches
 * from WooCommerce for display purposes (checkout separately reprices a
 * cart live for the same reason it always has - see api/orders/route.ts).
 *
 * Deliberately allowed to take a while - WooCommerce's own server capacity
 * is the bottleneck (confirmed: its own WP Admin slows down under this same
 * load), not something batching alone fixes. Vercel's default function
 * duration (300s on every current plan) comfortably covers a full run even
 * at WooCommerce's slow pace; nothing about a slow run here blocks a
 * customer, since customer-facing pages only ever read the cache.
 */
export async function syncPriceCache(): Promise<{
  synced: number;
  failed: number;
  tookMs: number;
}> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase is not configured");

  const started = Date.now();
  const live = await getLivePricingForSlugs(products);

  const rows = products
    .map((p) => {
      const l: LivePricing | undefined = live[p.slug];
      if (!l) return null; // WooCommerce lookup failed for this one - leave its existing cache row alone rather than overwrite with nothing.
      return {
        slug: p.slug,
        base_price: l.basePrice,
        tiers: l.tiers,
        size_tiers: l.sizeTiers ?? {},
        in_stock: l.inStock ?? p.inStock,
        synced_at: new Date().toISOString(),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length) {
    const { error } = await supabase.from("price_cache").upsert(rows, { onConflict: "slug" });
    if (error) throw error;
  }

  return {
    synced: rows.length,
    failed: products.length - rows.length,
    tookMs: Date.now() - started,
  };
}

export type CachedPricing = {
  basePrice: number;
  tiers: LivePricing["tiers"];
  sizeTiers?: LivePricing["sizeTiers"];
  inStock: boolean;
  syncedAt: string;
};

/** Fast read path for every customer-facing page - never touches WooCommerce. */
export async function getCachedPricing(
  slugs: string[]
): Promise<Record<string, CachedPricing>> {
  const supabase = getSupabaseAdmin();
  if (!supabase || !slugs.length) return {};

  const { data, error } = await supabase
    .from("price_cache")
    .select("slug, base_price, tiers, size_tiers, in_stock, synced_at")
    .in("slug", slugs);

  if (error || !data) {
    console.error("[price-cache] read failed", error);
    return {};
  }

  const out: Record<string, CachedPricing> = {};
  for (const row of data) {
    out[row.slug] = {
      basePrice: row.base_price,
      tiers: row.tiers,
      sizeTiers: row.size_tiers,
      inStock: row.in_stock,
      syncedAt: row.synced_at,
    };
  }
  return out;
}

/**
 * `product`, with cached price/stock overlaid. Reuses applyLivePricing's
 * merge logic directly - a CachedPricing row and a LivePricing result carry
 * the same basePrice/tiers/sizeTiers/inStock shape, so there is no reason to
 * duplicate the merge rules (only basePrice/tiers/each size's tiers/inStock
 * change; everything else - name, images, description - stays exactly as
 * authored in data/products.ts).
 */
export function withCachedPricing(product: Product, cached: CachedPricing | undefined): Product {
  return applyLivePricing(product, cached ?? null);
}

export async function withCachedPricingForAll(list: Product[]): Promise<Product[]> {
  const cached = await getCachedPricing(list.map((p) => p.slug));
  return list.map((p) => withCachedPricing(p, cached[p.slug]));
}
