import Link from "next/link";
import { bestsellers, products } from "@/data/products";
import Reveal from "@/components/ui/Reveal";
import BestsellersRail from "./BestsellersRail";

export default function BestsellersSection() {
  // In-stock only: a sold-out SKU in a "what people reorder" row is a dead end.
  const list = bestsellers().filter((p) => p.inStock).slice(0, 8);

  return (
    <section className="section-pad">
      <div className="container-site">
        <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 className="t-display-lg">What Researchers Reorder</h2>
          <Link
            href="/shop"
            className="text-[15px] font-semibold text-teal-dark hover:underline"
          >
            View All {products.length} <span aria-hidden>&rarr;</span>
          </Link>
        </Reveal>

        <BestsellersRail products={list} />
      </div>
    </section>
  );
}
