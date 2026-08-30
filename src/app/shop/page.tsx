import type { Metadata } from "next";
import { Suspense } from "react";
import ShopBrowser from "@/components/shop/ShopBrowser";
import ShopSkeleton from "@/components/shop/ShopSkeleton";
import { products } from "@/data/products";
import { SITE } from "@/lib/config";
import { withCachedPricingForAll } from "@/lib/price-cache";

export const metadata: Metadata = {
  title: "Shop all research peptides",
  description:
    "All 60 research peptides in vials, sprays, and capsules. Filter by format, research goal, and price. Every batch third-party tested with a published COA.",
  alternates: { canonical: "/shop" },
};

// Reads from Supabase's price_cache, not WooCommerce directly (see
// lib/price-cache.ts) - fast and cheap regardless of catalog size, so this
// window just avoids a redundant Supabase round trip on every request. The
// "Update Prices" button in /admin syncs Supabase AND clears this page's
// cache together, for whenever someone doesn't want to wait 5 minutes.
export const revalidate = 300;

const itemList = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  numberOfItems: products.length,
  itemListElement: products.map((p, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `${SITE.url}/product/${p.slug}`,
    name: p.name,
  })),
};

const breadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
    { "@type": "ListItem", position: 2, name: "Shop", item: `${SITE.url}/shop` },
  ],
};

export default async function ShopPage() {
  const priced = await withCachedPricingForAll(products);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {/* useSearchParams needs a Suspense boundary to stay statically
          shell-rendered. The fallback mirrors the real grid so hydration does
          not shift the page. */}
      <Suspense fallback={<ShopSkeleton />}>
        <ShopBrowser products={priced} />
      </Suspense>
    </>
  );
}
