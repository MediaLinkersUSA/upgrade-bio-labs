import type { Metadata } from "next";
import { Suspense } from "react";
import ShopBrowser from "@/components/shop/ShopBrowser";
import ShopSkeleton from "@/components/shop/ShopSkeleton";
import { products } from "@/data/products";
import { SITE } from "@/lib/config";
import { withLivePricingForAll } from "@/lib/live-pricing";

export const metadata: Metadata = {
  title: "Shop all research peptides",
  description:
    "All 60 research peptides in vials, sprays, and capsules. Filter by format, research goal, and price. Every batch third-party tested with a published COA.",
  alternates: { canonical: "/shop" },
};

// Same reasoning as the product page: re-rendered on this schedule so every
// visitor's HTML already has live prices/stock baked in, rather than a
// static grid that visibly updates itself after the fact.
export const revalidate = 45;

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
  const priced = await withLivePricingForAll(products);
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
