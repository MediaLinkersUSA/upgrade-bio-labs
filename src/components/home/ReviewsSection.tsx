"use client";

import Link from "next/link";
import { useRef } from "react";
import { aggregate, hasReviewCorpus, reviews } from "@/data/reviews";
import { getProduct } from "@/data/products";

/**
 * Sits above the products on purpose: a first-time visitor to a research
 * chemical site is asking whether you are legitimate, not what is on sale.
 *
 * Renders nothing until there is a real corpus. See src/data/reviews.ts.
 */
export default function ReviewsSection() {
  const railRef = useRef<HTMLDivElement>(null);
  if (!hasReviewCorpus()) return null;

  const agg = aggregate()!;
  const scroll = (dir: 1 | -1) =>
    railRef.current?.scrollBy({ left: dir * 360, behavior: "smooth" });

  return (
    <section className="section-pad -mt-6 rounded-t-[--radius-lg] bg-surface">
      <div className="container-site grid gap-10 lg:grid-cols-[300px_1fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="t-display-lg font-mono">{agg.average}</p>
          <p className="text-star" aria-hidden>
            {"★".repeat(Math.round(agg.average))}
          </p>
          <p className="mt-1 text-[15px] text-muted">
            {agg.count.toLocaleString()} verified researchers
          </p>

          <ul className="mt-5 space-y-1.5">
            {agg.distribution.map((d) => (
              <li key={d.star} className="flex items-center gap-2">
                <span className="font-mono text-[12px] text-faint">{d.star}★</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-soft">
                  <span
                    className="block h-full rounded-full bg-teal"
                    style={{ width: `${(d.count / agg.count) * 100}%` }}
                  />
                </span>
                <span className="w-8 text-right font-mono text-[12px] text-faint">
                  {d.count}
                </span>
              </li>
            ))}
          </ul>

          <ul className="mt-5 flex flex-wrap gap-1.5">
            {["verified purchase", "independently collected", "unedited"].map((c) => (
              <li key={c} className="label rounded-full bg-wash px-2.5 py-1.5 text-teal-dark">
                {c}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div ref={railRef} className="rail rail-fade pb-2">
            {reviews.map((r) => {
              const p = getProduct(r.productSlug);
              return (
                <article
                  key={r.id}
                  className="card w-[clamp(300px,34vw,380px)] p-5"
                >
                  <p className="text-star" aria-label={`${r.rating} out of 5`}>
                    {"★".repeat(r.rating)}
                  </p>
                  <h3 className="t-title mt-2">{r.headline}</h3>
                  <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-muted">
                    {r.body}
                  </p>
                  <footer className="mt-4 flex items-center gap-2 border-t border-line-soft pt-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-wash font-mono text-[12px] text-teal-dark">
                      {r.firstName[0]}
                    </span>
                    <span className="text-[13.5px] text-muted">
                      {r.firstName} {r.lastInitial}.
                    </span>
                    {r.verifiedPurchase && (
                      <span className="label text-teal-dark">Verified</span>
                    )}
                    {p && (
                      <Link
                        href={`/product/${p.slug}`}
                        className="label ml-auto rounded-full bg-surface-2 px-2.5 py-1.5 text-ink hover:bg-wash"
                      >
                        {p.name}
                      </Link>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => scroll(-1)}
              aria-label="Previous reviews"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line hover:border-teal"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              aria-label="More reviews"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line hover:border-teal"
            >
              →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
