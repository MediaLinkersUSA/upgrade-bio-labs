"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/data/types";

/**
 * Two slides: the product, and its actual certificate.
 *
 * Earlier versions padded this out with a scale comparison, a blend breakdown
 * and a testing checklist, plus a mocked-up COA table that carried the words
 * "illustrative layout". On a store whose entire pitch is that the receipts are
 * published, a fabricated certificate was the weakest thing on the page. It is
 * now a render of page one of the signed PDF (scripts/render-coa-previews.mjs),
 * so the proof is the proof.
 *
 * NOTE: adding a COA to a product means re-running that script, otherwise the
 * preview will 404.
 */

type Slide = { src: string; alt: string; label: string; kind: "product" | "coa" };

export default function Gallery({ product: p }: { product: Product }) {
  const [i, setI] = useState(0);

  const slides: Slide[] = [
    {
      kind: "product",
      src: p.image,
      alt: `${p.name}, ${p.purity} purity, research use only`,
      label: "Product",
    },
    ...(p.coaUrl
      ? [
          {
            kind: "coa" as const,
            src: `/coa/${p.slug}.webp`,
            alt: `Certificate of analysis for ${p.name}${p.coaBatch ? `, batch ${p.coaBatch}` : ""}`,
            label: "COA",
          },
        ]
      : []),
  ];

  const active = slides[Math.min(i, slides.length - 1)];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-lg bg-surface">
        <Image
          src={active.src}
          alt={active.alt}
          fill
          priority={active.kind === "product"}
          sizes="(max-width: 1024px) 92vw, 560px"
          // The certificate is a document: it should fill the frame and be
          // readable, not float in the middle like a product shot.
          className={active.kind === "coa" ? "object-contain" : "object-contain p-8"}
        />
      </div>

      {slides.length > 1 && (
        <ul className="mt-3 grid grid-cols-5 gap-2">
          {slides.map((s, n) => (
            <li key={s.label}>
              <button
                type="button"
                onClick={() => setI(n)}
                aria-label={`View ${s.label}`}
                aria-current={n === i}
                className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-sm bg-surface"
                style={{
                  border:
                    n === i
                      ? "2px solid var(--color-teal)"
                      : "1px solid var(--color-line-soft)",
                }}
              >
                <Image
                  src={s.src}
                  alt=""
                  fill
                  sizes="96px"
                  className={s.kind === "coa" ? "object-cover object-top" : "object-contain p-1.5"}
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {p.coaUrl && (
        <Link
          href="/quality#coas"
          className="btn-primary mt-4 flex w-full items-center justify-center gap-2"
        >
          <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path
              d="M4 2.5h6.5L14 6v9.5H4z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M10 2.5V6h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          View The COA Library
        </Link>
      )}
    </div>
  );
}
