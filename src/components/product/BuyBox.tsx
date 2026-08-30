"use client";

import { useEffect, useRef, useState } from "react";
import type { Product } from "@/data/types";
import { money, perMg, tierLabel } from "@/lib/pricing";
import { useCart } from "@/components/cart/CartProvider";
import FormatChip from "@/components/ui/FormatChip";
import NotifyMe from "./NotifyMe";
import CoaViewer from "./CoaViewer";
import { GOAL_META, SHIP_CUTOFF, SHIPPING_THRESHOLD } from "@/lib/config";
import { isTested } from "@/lib/testing";

/**
 * Counts a price up or down over 180ms. Small detail, but it is what makes a
 * tier change register as a price change rather than a silent swap.
 *
 * The animation is presentation only and must never be load-bearing for the
 * number itself: requestAnimationFrame does not run in a hidden or heavily
 * throttled tab, so a purely rAF-driven value can leave a stale price sitting
 * on the primary CTA. Every path here converges on `value`, and a timer
 * guarantees the final assignment even if no frame is ever served.
 */
function useCountTo(value: number, ms = 180) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const settle = () => {
      fromRef.current = value;
      setDisplay(value);
    };

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || typeof document === "undefined" || document.hidden) {
      settle();
      return;
    }

    const from = fromRef.current;
    if (from === value) return;

    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      setDisplay(from + (value - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
      else settle();
    };
    raf = requestAnimationFrame(tick);

    // Backstop: if no frame is ever served, still land on the right number.
    const guard = setTimeout(settle, ms + 120);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(guard);
    };
  }, [value, ms]);

  return display;
}

export default function BuyBox({ product: p }: { product: Product }) {
  // `product` arrives already carrying live WooCommerce price/stock - the
  // page that renders this fetched it server-side before responding, so the
  // number on screen is never stale and never has to swap after the fact.
  // See app/product/[slug]/page.tsx for the fetch and its revalidate window.

  const { add } = useCart();
  const [tierIdx, setTierIdx] = useState(0);
  // -1 means "nothing chosen yet". Multi-size SKUs deliberately start here so
  // the buyer has to pick: pre-selecting the smaller fill meant most people
  // took it by default without noticing the choice existed.
  const [sizeIdx, setSizeIdx] = useState(-1);
  const tiersRef = useRef<HTMLDivElement>(null);

  // Every declared size is listed, but only priced ones are selectable. A size
  // the client has told us exists and has not priced yet shows as disabled
  // rather than disappearing (which reads as "we don't stock it") or carrying
  // an invented number.
  const sizes = p.sizes ?? [];
  const priced = (i: number) => !!sizes[i]?.tiers?.length;
  const firstPriced = sizes.findIndex((_, i) => priced(i));
  const hasSizes = sizes.length > 1 && firstPriced !== -1;

  // Guarded rather than clamped: a stale index from a client navigation must
  // not land on an unpriced size.
  const chosen = hasSizes && priced(sizeIdx);
  const activeSize = chosen ? sizes[sizeIdx] : null;
  /** Multi-size SKU with no choice made yet: price and CTA stay withheld. */
  const awaitingSize = hasSizes && !chosen;

  // Until a size is picked, fall back to the smallest priced fill purely so
  // the ladder and per-mg row have something coherent to render against.
  const tiers = activeSize?.tiers ?? sizes[firstPriced]?.tiers ?? p.tiers;
  const basePrice = tiers[0]?.unitPrice ?? p.basePrice;
  const doseMg = activeSize?.doseMg ?? (hasSizes ? undefined : p.doseMg);

  const hasLadder = new Set(tiers.map((t) => t.unitPrice)).size > 1;
  const tier = tiers[tierIdx] ?? tiers[0];
  const qty = tier.minQty;
  const lineTotal = tier.unitPrice * qty;
  const animated = useCountTo(lineTotal);

  const onTierKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next =
      e.key === "ArrowRight"
        ? Math.min(tiers.length - 1, tierIdx + 1)
        : Math.max(0, tierIdx - 1);
    setTierIdx(next);
    tiersRef.current
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      [next]?.focus();
  };

  return (
    <div className="lg:sticky lg:top-[88px]">
      <div className="flex flex-wrap items-center gap-1.5">
        <FormatChip format={p.format} />
        {p.goals.map((g) => (
          <span key={g} className="label rounded-full bg-surface-2 px-2.5 py-1.5 text-muted">
            {GOAL_META[g].title}
          </span>
        ))}
      </div>

      <h1 className="t-display-md mt-4">{p.name}</h1>
      {p.blend?.length ? (
        <p className="mt-1.5 font-mono text-[13px] text-muted">{p.blend.join(" · ")}</p>
      ) : null}

      <dl className="mt-5 flex flex-wrap gap-x-4 gap-y-1 border-y border-line-soft py-3 font-mono text-[13px] text-muted">
        {doseMg ? (
          <div><dt className="sr-only">Total mass</dt><dd>{doseMg}mg</dd></div>
        ) : null}
        {p.volumeMl ? (
          <div><dt className="sr-only">Volume</dt><dd>{p.volumeMl}ml</dd></div>
        ) : null}
        {p.countCt ? (
          <div><dt className="sr-only">Count</dt><dd>{p.countCt}ct</dd></div>
        ) : null}
        {/* Purity is a spec of a synthesised compound. On bacteriostatic water
            it is noise, so supplies do not carry it. */}
        {p.format !== "supply" && (
          <div><dt className="sr-only">Purity</dt><dd>{p.purity} purity</dd></div>
        )}
        {p.presentation && (
          <div><dt className="sr-only">Presentation</dt><dd>{p.presentation}</dd></div>
        )}
        {perMg(p, { basePrice, doseMg }) && (
          <div>
            <dt className="sr-only">Price per mg</dt>
            <dd>{perMg(p, { basePrice, doseMg })}</dd>
          </div>
        )}
      </dl>

      <div className="mt-5 flex items-baseline gap-3">
        {p.compareAt && (
          <span className="font-mono text-[16px] text-faint line-through">
            {money(p.compareAt)}
          </span>
        )}
        {/* No price is shown until a size is chosen: quoting one implies a
            default selection, which is the behaviour being removed. */}
        <span className="t-display-md">
          {awaitingSize ? "Select a size" : money(basePrice)}
        </span>
      </div>

      {/* Fill size. Only rendered where the SKU genuinely ships in more than
          one, so no single-option dropdown is ever shown. */}
      {hasSizes && (
        <div className="mt-6">
          <label htmlFor={`size-${p.slug}`} className="label mb-2 block text-muted">
            Size
          </label>
          <select
            id={`size-${p.slug}`}
            value={chosen ? sizeIdx : ""}
            onChange={(e) => {
              setSizeIdx(Number(e.target.value));
              setTierIdx(0);
            }}
            aria-required
            className="w-full rounded-sm border bg-surface px-4 py-3.5 text-[15px] font-medium text-ink focus:border-teal focus:outline-none"
            style={{
              // Nudge, not an error: nothing is wrong until they try to buy.
              borderColor: awaitingSize ? "var(--color-teal)" : "var(--color-line)",
            }}
          >
            <option value="" disabled>
              Select a size
            </option>
            {sizes.map((s, i) => (
              <option key={s.label} value={i} disabled={!priced(i)}>
                {priced(i)
                  ? `${s.label} - ${money(s.tiers![0].unitPrice)}`
                  : `${s.label} - Coming Soon`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Quantity tiers. Withheld until a size is chosen, since the prices on
          them belong to a specific fill. */}
      {hasLadder && !awaitingSize && (
        <div
          ref={tiersRef}
          role="radiogroup"
          aria-label="Quantity"
          onKeyDown={onTierKey}
          className="mt-6 grid gap-2"
          style={{ gridTemplateColumns: `repeat(${tiers.length}, minmax(0,1fr))` }}
        >
          {tiers.map((t, i) => {
            const active = i === tierIdx;
            const save = Math.round((1 - t.unitPrice / basePrice) * 100);
            return (
              <div key={t.minQty} className="relative pt-2.5">
                {t.label && (
                  <span
                    className="label absolute left-1/2 top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-1"
                    style={{
                      // teal-deep, not teal: white on the brand teal is 3.02
                      background: active ? "var(--color-teal-deep)" : "var(--color-navy)",
                      color: "#fff",
                    }}
                  >
                    {t.label}
                  </span>
                )}
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setTierIdx(i)}
                  className="relative w-full rounded-sm px-2 py-4 text-center transition-colors"
                  style={{
                    border: active ? "2px solid var(--color-teal)" : "1px solid var(--color-line)",
                    background: active ? "var(--color-spray-wash)" : "var(--color-surface)",
                  }}
                >
                  {active && (
                    <span className="absolute right-2 top-2 text-teal" aria-hidden>
                      <svg width="13" height="13" viewBox="0 0 16 16">
                        <path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                  {/* The accessible name is built from the visible text plus
                      this hidden context, rather than an aria-label that would
                      override (and then mismatch) what is on screen. */}
                  <span className="sr-only">
                    Buy {tierLabel(tiers, i)}
                    {t.label ? `, ${t.label}` : ""},
                  </span>
                  <span className="block font-mono text-[17px] font-semibold" aria-hidden>
                    {tierLabel(tiers, i)}
                  </span>
                  <span className="mt-1 block font-mono text-[14px]">{money(t.unitPrice)}</span>
                  <span className="block text-[12px] text-muted">Each</span>
                  {save > 0 && (
                    <span className="mt-1 block text-[12px] font-semibold text-teal-dark">
                      Save {save}%
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {p.inStock ? (
        <button
          type="button"
          onClick={() => add(p.slug, qty, activeSize?.label)}
          disabled={awaitingSize}
          aria-describedby={awaitingSize ? `size-${p.slug}` : undefined}
          className="btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-45"
        >
          {awaitingSize ? "Select A Size To Continue" : `Add To Cart · ${money(animated)}`}
        </button>
      ) : (
        <div className="mt-5">
          <NotifyMe slug={p.slug} name={p.name} />
        </div>
      )}

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
        <li>Free Shipping Over ${SHIPPING_THRESHOLD}</li>
        <li>Damage Protection</li>
        <li>Ships today if ordered by {SHIP_CUTOFF}</li>
      </ul>

      <p className="mt-3 font-mono text-[12px] text-faint">
        visa · mastercard · amex · discover
      </p>

      {/* Supplies carry no testing of ours, so no certificate is offered even
          where the scrape left a URL behind. */}
      {p.coaUrl && isTested(p) && (
        <CoaViewer
          slug={p.slug}
          name={p.name}
          batch={p.coaBatch}
          className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-semibold text-teal-dark hover:underline"
        />
      )}
    </div>
  );
}
