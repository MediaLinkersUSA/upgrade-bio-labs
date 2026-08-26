"use client";

import { useMemo } from "react";
import type { Product } from "@/data/types";
import ProductCard from "./ProductCard";
import { useLivePrices } from "@/lib/use-live-prices";
import { applyLivePricing } from "@/lib/apply-live-pricing";

/**
 * The "Pairs Well With" grid on a product page.
 *
 * A small client wrapper around ProductCard purely so this one section can
 * fetch live prices for its own handful of slugs - the page itself stays a
 * statically generated Server Component.
 */
export default function RelatedProducts({
  products: staticProducts,
  sizes,
}: {
  products: Product[];
  sizes: string;
}) {
  const livePrices = useLivePrices(useMemo(() => staticProducts.map((p) => p.slug), [staticProducts]));
  const products = useMemo(
    () => staticProducts.map((p) => applyLivePricing(p, livePrices[p.slug])),
    [staticProducts, livePrices]
  );

  return (
    <ul className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
      {products.map((x) => (
        <li key={x.slug}>
          <ProductCard product={x} sizes={sizes} />
        </li>
      ))}
    </ul>
  );
}
