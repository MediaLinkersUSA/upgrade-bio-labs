import type { Product } from "@/data/types";
import ProductCard from "./ProductCard";

/**
 * The "Pairs Well With" grid on a product page.
 *
 * `products` arrives already live-priced - the page fetched it server-side
 * (see app/product/[slug]/page.tsx) alongside the main product, so this can
 * now render as a plain Server Component instead of a client-side fetch
 * wrapper.
 */
export default function RelatedProducts({
  products,
  sizes,
}: {
  products: Product[];
  sizes: string;
}) {
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
