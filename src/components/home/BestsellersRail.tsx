"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Product } from "@/data/types";
import ProductCard from "@/components/product/ProductCard";

/**
 * Horizontal product rail. Scrolls rather than wrapping to a second row, so
 * the row reads as "there is more" instead of terminating.
 *
 * Native scroll with snap points, not a carousel library: it keeps trackpad,
 * touch, and keyboard behavior for free and adds nothing to the JS budget.
 */
export default function BestsellersRail({ products }: { products: Product[] }) {
  const railRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // Only commit when the value actually flips, so scrolling does not churn
    // state on every frame.
    setAtStart((prev) => {
      const next = el.scrollLeft <= 2;
      return prev === next ? prev : next;
    });
    setAtEnd((prev) => {
      const next = el.scrollLeft >= max - 2;
      return prev === next ? prev : next;
    });
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    // A window resize listener rather than a ResizeObserver on the rail: the
    // observer's callback sets state, and state changes the disabled arrows,
    // which can re-enter the observer and spin.
    window.addEventListener("resize", sync, { passive: true });
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sync]);

  const page = (dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    // Advance by whole cards so the rail never stops mid-card.
    const card = el.querySelector("li");
    const step = card ? card.getBoundingClientRect().width + 18 : el.clientWidth * 0.8;
    const count = Math.max(1, Math.floor(el.clientWidth / step));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: dir * step * count,
      behavior: reduced ? "instant" : "smooth",
    });
  };

  return (
    <div className="relative">
      <ul
        ref={railRef}
        className="hide-scrollbar flex snap-x snap-mandatory gap-[18px] overflow-x-auto scroll-smooth pb-2"
      >
        {products.map((p) => (
          <li
            key={p.slug}
            className="w-[78vw] max-w-[300px] shrink-0 snap-start sm:w-[46vw] lg:w-[calc((100%-54px)/4)]"
          >
            <ProductCard product={p} sizes="(max-width: 640px) 78vw, (max-width: 1024px) 46vw, 280px" />
          </li>
        ))}
      </ul>

      {/* Controls sit outside the scroll container so they never scroll away. */}
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => page(-1)}
          disabled={atStart}
          aria-label="Scroll products left"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-teal disabled:cursor-not-allowed disabled:opacity-35"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M10 3.2L5.2 8l4.8 4.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => page(1)}
          disabled={atEnd}
          aria-label="Scroll products right"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-teal disabled:cursor-not-allowed disabled:opacity-35"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M6 3.2L10.8 8 6 12.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
