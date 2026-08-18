"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/data/types";
import {
  bestSavingForTiers,
  bestTierQty,
  bestTierSaving,
  displayPrice,
  fromPrice,
  hasPricedSizes,
  money,
  perMg,
} from "@/lib/pricing";
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

  // Multi-size SKUs get an inline size picker right on the card, mirroring
  // the PDP's rule: never guess which fill the customer wants. -1 means
  // nothing chosen yet.
  const hasSizes = hasPricedSizes(p);
  const [sizeIdx, setSizeIdx] = useState(-1);
  const priced = (i: number) => !!p.sizes?.[i]?.tiers?.length;
  const chosen = hasSizes && sizeIdx >= 0 && priced(sizeIdx);
  const activeSize = chosen ? p.sizes![sizeIdx] : null;
  const awaitingSize = hasSizes && !chosen;

  const price = chosen ? activeSize!.tiers![0].unitPrice : hasSizes ? fromPrice(p) : displayPrice(p);
  const saving = chosen
    ? bestSavingForTiers(activeSize!.tiers!)
    : hasSizes
    ? 0
    : bestTierSaving(p);
  const saveQty = chosen ? activeSize!.tiers![activeSize!.tiers!.length - 1].minQty : bestTierQty(p);
  // Dose is per-size on a multi-size SKU, so it stays hidden until a size is
  // picked rather than showing whichever fill happens to sit in p.doseMg.
  const doseMg = hasSizes ? activeSize?.doseMg : p.doseMg;
  const mg = hasSizes
    ? chosen
      ? perMg(p, { basePrice: price, doseMg: activeSize?.doseMg })
      : null
    : perMg(p);
  const sub = p.blend?.length ? p.blend.join(" · ") : p.short;

  return (
    <article className="card card-hover group flex h-full flex-col overflow-hidden">
      <Link
        href={`/product/${p.slug}`}
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
            <Link href={`/product/${p.slug}`} className="hover:text-teal-dark">
              {p.name}
            </Link>
          </h3>
          <p className="mt-1 line-clamp-1 text-[13.5px] text-muted">{sub}</p>
        </div>

        <dl className="data mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line-soft pt-2.5 text-faint">
          {doseMg ? (
            <div>
              <dt className="sr-only">Total mass</dt>
              <dd>{doseMg}mg</dd>
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
          <p className="t-display-md leading-none">
            {/* "From" only ever labels the low end of a real range - never a
                specific size's price standing in as if it were the default. */}
            {awaitingSize && <span className="mr-1 text-[13px] font-normal text-muted">From</span>}
            {money(price)}
          </p>
          {saving > 0 && (
            <span className="whitespace-nowrap rounded-full bg-wash px-2.5 py-1 text-[12px] font-semibold leading-none text-teal-dark">
              Save {saving}% At {saveQty}+
            </span>
          )}
        </div>

        {/* Size picker, only for SKUs that genuinely ship in more than one
            fill. Lets the customer choose without leaving the grid, instead
            of silently adding whichever size the top-level tiers happen to
            match. */}
        {hasSizes && p.inStock && (
          <label className="block">
            <span className="sr-only">Size</span>
            <select
              value={chosen ? sizeIdx : ""}
              onChange={(e) => {
                e.preventDefault();
                setSizeIdx(Number(e.target.value));
              }}
              // Stop the card's wrapping <Link> from swallowing pointer/­focus
              // events meant for the select.
              onClick={(e) => e.stopPropagation()}
              aria-label={`Size for ${p.name}`}
              className="w-full rounded-sm border bg-surface px-3 py-2.5 text-[14px] font-medium text-ink focus:border-teal focus:outline-none"
              style={{
                borderColor: awaitingSize ? "var(--color-teal)" : "var(--color-line)",
              }}
            >
              <option value="" disabled>
                Select a size
              </option>
              {p.sizes!.map((s, i) => (
                <option key={s.label} value={i} disabled={!priced(i)}>
                  {priced(i) ? `${s.label} - ${money(s.tiers![0].unitPrice)}` : `${s.label} - Coming Soon`}
                </option>
              ))}
            </select>
          </label>
        )}

        {p.inStock ? (
          <button
            type="button"
            onClick={() => add(p.slug, 1, activeSize?.label)}
            disabled={awaitingSize}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-45"
          >
            {awaitingSize ? "Select A Size" : `Add To Order · ${money(price)}`}
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
