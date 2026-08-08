"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/data/types";
import { bestTierQty, bestTierSaving, displayPrice, money, perMg } from "@/lib/pricing";
import { useCart } from "@/components/cart/CartProvider";
import FormatChip from "@/components/ui/FormatChip";
import NotifyMe from "./NotifyMe";

export default function ProductCard({
  product: p,
  sizes = "(max-width: 640px) 78vw, (max-width: 1024px) 45vw, 280px",
  priority = false,
}: {
  product: Product;
  sizes?: string;
  priority?: boolean;
}) {
  const { add } = useCart();
  const [notify, setNotify] = useState(false);

  const saving = bestTierSaving(p);
  const mg = perMg(p);
  const sub = p.blend?.length ? p.blend.join(" · ") : p.short;

  return (
    <article className="card card-hover group flex h-full flex-col overflow-hidden">
      <Link
        href={`/products/${p.slug}`}
        className="relative block aspect-square overflow-hidden bg-surface"
        tabIndex={-1}
      >
        <div className="absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
          <FormatChip format={p.format} />
          {p.bestseller && p.inStock && (
            <span className="label rounded-full bg-navy px-2.5 py-1.5 text-white">
              Bestseller
            </span>
          )}
        </div>

        <Image
          src={p.image}
          alt={`${p.name} - ${p.purity} purity, research use only`}
          fill
          sizes={sizes}
          priority={priority}
          className={`object-contain p-[18px] transition-transform duration-[220ms] ease-[var(--ease-out)] group-hover:scale-[1.03] ${
            p.inStock ? "" : "opacity-45"
          }`}
        />
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-4 pt-3">
        <div>
          <h3 className="t-title">
            <Link href={`/products/${p.slug}`} className="hover:text-teal-dark">
              {p.name}
            </Link>
          </h3>
          <p className="mt-1 line-clamp-1 text-[13.5px] text-muted">{sub}</p>
        </div>

        <dl className="data mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line-soft pt-2.5 text-faint">
          {p.doseMg ? (
            <div>
              <dt className="sr-only">Total mass</dt>
              <dd>{p.doseMg}mg</dd>
            </div>
          ) : p.volumeMl ? (
            <div>
              <dt className="sr-only">Volume</dt>
              <dd>{p.volumeMl}ml</dd>
            </div>
          ) : null}
          {/* Purity is a compound spec; it means nothing on a supply SKU. */}
          {p.format !== "supply" && (
            <div>
              <dt className="sr-only">Purity</dt>
              <dd>{p.purity}</dd>
            </div>
          )}
          {mg && (
            <div>
              <dt className="sr-only">Price per mg</dt>
              <dd>{mg}</dd>
            </div>
          )}
        </dl>

        {/* Price and saving chip share a baseline. The chip is nowrap so it
            can never wrap to two lines and drag itself out of alignment. */}
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5">
          <p className="t-display-md leading-none">{money(displayPrice(p))}</p>
          {saving > 0 && (
            <span className="whitespace-nowrap rounded-full bg-wash px-2.5 py-1 text-[12px] font-semibold leading-none text-teal-dark">
              Save {saving}% At {bestTierQty(p)}+
            </span>
          )}
        </div>

        {p.inStock ? (
          <button
            type="button"
            onClick={() => add(p.slug)}
            className="btn-primary w-full"
          >
            Add To Order · {money(displayPrice(p))}
          </button>
        ) : notify ? (
          <NotifyMe slug={p.slug} name={p.name} onDone={() => setNotify(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setNotify(true)}
            className="btn-ghost w-full"
          >
            Notify Me <span aria-hidden>&rarr;</span>
          </button>
        )}
      </div>
    </article>
  );
}
