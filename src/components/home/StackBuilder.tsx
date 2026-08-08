"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { compounds, getProduct } from "@/data/products";
import { money, stackDiscount } from "@/lib/pricing";
import { GOAL_META, GOAL_ORDER } from "@/lib/config";
import { useCart } from "@/components/cart/CartProvider";
import FormatIcon from "@/components/ui/FormatIcon";
import type { Format } from "@/data/types";

const PRESETS = [
  { label: "Recovery Stack", slugs: ["bpc-157", "tb-500", "kpv"] },
  { label: "Longevity Stack", slugs: ["nad", "ss-31", "epithalon"] },
  { label: "Metabolic Stack", slugs: ["rt-3", "tesamorelin-ipamorelin-blend", "mots-c"] },
  { label: "Beauty Stack", slugs: ["glow-blendbpc-157-tb-500-ghk-cu", "mots-c", "glutathione"] },
];

const FORMATS: Format[] = ["vial", "spray", "capsule"];

export default function StackBuilder() {
  const { addMany } = useCart();
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null]);
  const [picking, setPicking] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [fFormat, setFFormat] = useState<Format | "all">("all");
  const [fGoal, setFGoal] = useState<string>("all");

  const chosen = slots.filter(Boolean) as string[];
  const distinct = new Set(chosen).size;
  const rate = stackDiscount(distinct);

  const subtotal = chosen.reduce((s, sl) => s + (getProduct(sl)?.basePrice ?? 0), 0);
  const discount = +(subtotal * rate).toFixed(2);
  const pay = subtotal - discount;

  const options = useMemo(() => {
    const term = q.trim().toLowerCase();
    return compounds()
      .filter((p) => p.inStock)
      .filter((p) => (fFormat === "all" ? true : p.format === fFormat))
      .filter((p) => (fGoal === "all" ? true : p.goals.includes(fGoal as never)))
      .filter((p) =>
        term
          ? p.name.toLowerCase().includes(term) ||
            (p.blend ?? []).some((b) => b.toLowerCase().includes(term))
          : true
      )
      .filter((p) => !chosen.includes(p.slug))
      .slice(0, 24);
  }, [q, fFormat, fGoal, chosen]);

  const setSlot = (i: number, slug: string | null) =>
    setSlots((prev) => prev.map((s, n) => (n === i ? slug : s)));

  const tierMsg =
    distinct === 0
      ? "Pick any 2 compounds to save 15%"
      : distinct === 1
        ? "1 of 3 - Add one more to save 15%"
        : distinct === 2
          ? "2 of 3 - Add one more to save 20%"
          : "3 of 3 - Saving 20%";

  return (
    <section id="build-your-stack" className="section-pad section-round bg-navy text-white">
      <div className="container-site">
        <h2 className="t-display-md">Build Your Stack. Save Up To 20%.</h2>
        <p className="mt-2 text-[15px] text-white/70">
          Any 2 compounds, 15% off. Any 3, 20% off. No code, applied at cart.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {slots.map((slug, i) => {
            const p = slug ? getProduct(slug) : null;
            return (
              <div key={i} className="relative">
                {p ? (
                  <div className="flex h-[168px] flex-col items-center justify-center gap-2 rounded-md bg-white/[0.07] p-4 text-center">
                    <button
                      type="button"
                      onClick={() => setSlot(i, null)}
                      aria-label={`Remove ${p.name}`}
                      className="absolute right-3 top-3 rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white"
                    >
                      <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden>
                        <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </button>
                    <div className="relative h-20 w-20 overflow-hidden rounded-sm bg-white">
                      <Image src={p.image} alt="" fill sizes="80px" className="object-contain" />
                    </div>
                    <p className="text-[15px] font-semibold leading-tight">{p.name}</p>
                    <span className="label inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5 text-white/80">
                      <FormatIcon format={p.format} size={11} />
                      {p.format}
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPicking(picking === i ? null : i)}
                    aria-expanded={picking === i}
                    className="flex h-[168px] w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-white/25 text-white/70 transition-colors hover:border-white/50 hover:text-white"
                  >
                    <span className="text-2xl leading-none" aria-hidden>+</span>
                    <span className="text-[15px]">Add Compound</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {picking !== null && (
          <div className="mt-4 rounded-md bg-white/[0.06] p-4">
            <div className="flex flex-wrap gap-2">
              <label className="sr-only" htmlFor="stack-search">Search compounds</label>
              <input
                id="stack-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search compounds"
                className="min-w-[180px] flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[14px] text-white placeholder:text-white/50 focus:border-teal focus:outline-none"
              />
              <select
                aria-label="Filter by format"
                value={fFormat}
                onChange={(e) => setFFormat(e.target.value as Format | "all")}
                className="rounded-full border border-white/20 bg-navy px-3 py-2 text-[14px] text-white"
              >
                <option value="all">All Formats</option>
                {FORMATS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <select
                aria-label="Filter by goal"
                value={fGoal}
                onChange={(e) => setFGoal(e.target.value)}
                className="rounded-full border border-white/20 bg-navy px-3 py-2 text-[14px] text-white"
              >
                <option value="all">All Goals</option>
                {GOAL_ORDER.map((g) => (
                  <option key={g} value={g}>{GOAL_META[g].title}</option>
                ))}
              </select>
            </div>

            {options.length === 0 ? (
              <p className="mt-4 text-[14px] text-white/70">
                Nothing matches those filters. Try clearing the search.
              </p>
            ) : (
              <ul className="mt-4 grid max-h-[300px] grid-cols-2 gap-2 overflow-y-auto md:grid-cols-4">
                {options.map((p) => (
                  <li key={p.slug}>
                    <button
                      type="button"
                      onClick={() => {
                        setSlot(picking, p.slug);
                        setPicking(null);
                        setQ("");
                      }}
                      className="flex w-full items-center gap-2 rounded-sm bg-white/[0.06] p-2 text-left hover:bg-white/[0.12]"
                    >
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-white">
                        <Image src={p.image} alt="" fill sizes="40px" className="object-contain" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-medium">{p.name}</span>
                        <span className="block font-mono text-[11.5px] text-white/60">
                          {money(p.basePrice)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Progress toward the next discount tier, then totals and CTA on one
            line. The previous stacked layout left a large dead band between the
            numbers and the button. */}
        <div className="mt-6 rounded-md bg-white/[0.06] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[15px] font-semibold text-white">
              {tierMsg}
            </p>
            <p className="data text-white/70">
              {distinct}/3 compounds
            </p>
          </div>

          <div className="mt-3 flex gap-1.5" aria-hidden>
            {[0, 1, 2].map((n) => (
              <span
                key={n}
                className="h-1.5 flex-1 rounded-full transition-colors duration-300"
                style={{
                  background:
                    n < distinct ? "var(--color-teal-on-navy)" : "rgba(255,255,255,0.16)",
                }}
              />
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <div className="flex items-baseline gap-2">
                <dt className="text-[13px] text-white/80">Subtotal</dt>
                <dd className="data text-white/80 line-through decoration-white/30">
                  {rate > 0 ? money(subtotal) : ""}
                </dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt className="text-[13px] text-white/80">You Pay</dt>
                <dd className="t-display-md leading-none">{money(pay)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex items-baseline gap-2">
                  <dt className="text-[13px] text-[var(--color-teal-on-navy)]">You Save</dt>
                  <dd className="data font-semibold text-[var(--color-teal-on-navy)]">
                    {money(discount)}
                  </dd>
                </div>
              )}
            </dl>

            <button
              type="button"
              disabled={distinct < 2}
              onClick={() => addMany(chosen)}
              className="btn-primary btn-teal w-full sm:w-auto"
            >
              {distinct < 2
                ? `Add ${2 - distinct} more to save 15%`
                : `add stack to cart · ${money(pay)}`}
            </button>
          </div>
        </div>

        {/* Presets: most people will use these. */}
        <div className="mt-6">
          <p className="label mb-3 text-white/60">Or Start From A Preset</p>
          <ul className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <li key={preset.label}>
                <button
                  type="button"
                  onClick={() => {
                    setSlots(preset.slugs.map((s) => (getProduct(s) ? s : null)));
                    setPicking(null);
                  }}
                  className="rounded-full border border-white/25 px-4 py-2.5 text-[14px] font-medium text-white/90 transition-colors hover:border-[var(--color-teal-on-navy)] hover:text-white"
                >
                  {preset.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
