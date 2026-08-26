"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { products as staticProducts } from "@/data/products";
import type { Format, Product } from "@/data/types";
import { FORMAT_META, GOAL_META, GOAL_ORDER } from "@/lib/config";
import ProductCard from "@/components/product/ProductCard";
import FormatIcon from "@/components/ui/FormatIcon";
import { useLivePrices } from "@/lib/use-live-prices";
import { applyLivePricing } from "@/lib/apply-live-pricing";

const FORMATS: Format[] = ["vial", "spray", "capsule", "supply"];

const SORTS = {
  bestselling: "bestselling",
  "price-asc": "price low to high",
  "price-desc": "price high to low",
  az: "A to Z",
} as const;
type SortKey = keyof typeof SORTS;

// Based on the static catalog, same as everything else at module scope - it
// only sets the slider's ceiling, so it does not need to track live prices.
const PRICE_MAX = Math.ceil(Math.max(...staticProducts.map((p) => p.basePrice)) / 10) * 10;

interface Filters {
  format: Format | null;
  goal: string | null;
  max: number;
  inStockOnly: boolean;
  sort: SortKey;
}

function apply(list: Product[], f: Partial<Filters>) {
  return list
    .filter((p) => (f.format ? p.format === f.format : true))
    .filter((p) => (f.goal ? p.goals.includes(f.goal as never) : true))
    .filter((p) => (f.max != null ? p.basePrice <= f.max : true))
    .filter((p) => (f.inStockOnly ? p.inStock : true));
}

function sortList(list: Product[], sort: SortKey) {
  const out = [...list];
  switch (sort) {
    case "price-asc": return out.sort((a, b) => a.basePrice - b.basePrice);
    case "price-desc": return out.sort((a, b) => b.basePrice - a.basePrice);
    case "az": return out.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return out.sort(
        (a, b) =>
          Number(!!b.bestseller) - Number(!!a.bestseller) ||
          Number(b.inStock) - Number(a.inStock) ||
          a.name.localeCompare(b.name)
      );
  }
}

export default function ShopBrowser() {
  const router = useRouter();
  const sp = useSearchParams();

  // The page renders instantly with the static catalog's prices, then this
  // fetches WooCommerce's current prices for the whole grid in one request
  // and swaps them in - filtering, sorting, and every card all then work off
  // the same live numbers, not a mix of live and stale ones.
  const livePrices = useLivePrices(useMemo(() => staticProducts.map((p) => p.slug), []));
  const products = useMemo(
    () => staticProducts.map((p) => applyLivePricing(p, livePrices[p.slug])),
    [livePrices]
  );

  const filters: Filters = {
    format: (FORMATS.includes(sp.get("format") as Format) ? sp.get("format") : null) as Format | null,
    goal: GOAL_ORDER.includes(sp.get("goal") as never) ? sp.get("goal") : null,
    max: Number(sp.get("max")) || PRICE_MAX,
    inStockOnly: sp.get("stock") === "1",
    sort: (Object.keys(SORTS).includes(sp.get("sort") ?? "") ? sp.get("sort") : "bestselling") as SortKey,
  };

  /** All filter state lives in the URL, so a filtered view is shareable and
   *  the back button behaves. */
  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(sp.toString());
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
      router.replace(next.toString() ? `/shop?${next}` : "/shop", { scroll: false });
    },
    [router, sp]
  );

  const results = useMemo(
    () => sortList(apply(products, filters), filters.sort),
    [products, filters]
  );

  // For the empty state: which single filter, if dropped, recovers the most?
  const rescue = useMemo(() => {
    if (results.length > 0) return null;
    const candidates: { key: string; label: string; count: number }[] = [];
    if (filters.max < PRICE_MAX)
      candidates.push({
        key: "max",
        label: `under $${filters.max}`,
        count: apply(products, { ...filters, max: PRICE_MAX }).length,
      });
    if (filters.goal)
      candidates.push({
        key: "goal",
        label: GOAL_META[filters.goal as keyof typeof GOAL_META].title,
        count: apply(products, { ...filters, goal: null }).length,
      });
    if (filters.format)
      candidates.push({
        key: "format",
        label: FORMAT_META[filters.format].label,
        count: apply(products, { ...filters, format: null }).length,
      });
    if (filters.inStockOnly)
      candidates.push({
        key: "stock",
        label: "in stock only",
        count: apply(products, { ...filters, inStockOnly: false }).length,
      });
    return candidates.filter((c) => c.count > 0).sort((a, b) => b.count - a.count)[0] ?? null;
  }, [results.length, products, filters]);

  const countFor = (f: Format) =>
    apply(products, { ...filters, format: f }).length;

  return (
    <div className="container-site py-10">
      <header className="mb-7">
        <h1 className="t-display-lg">All Peptides</h1>
        <p className="mt-2 text-[15px] text-muted">
          {products.length} compounds across vials, sprays, and capsules.
          Every batch third-party tested.
        </p>
      </header>

      {/* Fast-path format tabs. Most people use these rather than the rail. */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-2">
          <li>
            <button
              type="button"
              onClick={() => setParam("format", null)}
              aria-pressed={!filters.format}
              className="rounded-full border px-4 py-2 text-[14px] font-medium transition-colors"
              style={{
                borderColor: !filters.format ? "var(--color-teal)" : "var(--color-line)",
                background: !filters.format ? "var(--color-wash)" : "transparent",
                color: !filters.format ? "var(--color-teal-dark)" : "var(--color-ink)",
              }}
            >
              All
            </button>
          </li>
          {FORMATS.map((f) => {
            const on = filters.format === f;
            return (
              <li key={f}>
                <button
                  type="button"
                  onClick={() => setParam("format", on ? null : f)}
                  aria-pressed={on}
                  className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[14px] font-medium transition-colors"
                  style={{
                    borderColor: on ? "var(--color-teal)" : "var(--color-line)",
                    background: on ? "var(--color-wash)" : "transparent",
                    color: on ? "var(--color-teal-dark)" : "var(--color-ink)",
                  }}
                >
                  <FormatIcon format={f} size={13} />
                  {FORMAT_META[f].label}
                </button>
              </li>
            );
          })}
        </ul>

        <label className="flex items-center gap-2 text-[14px]">
          <span className="text-muted">Sort</span>
          <select
            value={filters.sort}
            onChange={(e) => setParam("sort", e.target.value)}
            className="rounded-full border border-line bg-surface px-3 py-2 text-[14px]"
          >
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Filter rail */}
        <aside className="lg:sticky lg:top-[88px] lg:self-start">
          <section className="mb-6">
            <h2 className="label mb-2.5 text-muted">Format</h2>
            <ul className="space-y-1.5">
              {FORMATS.map((f) => (
                <li key={f}>
                  <label className="flex cursor-pointer items-center gap-2 text-[14.5px]">
                    <input
                      type="radio"
                      name="format"
                      checked={filters.format === f}
                      onChange={() => setParam("format", f)}
                      className="accent-[var(--color-teal)]"
                    />
                    <span className="flex-1">{FORMAT_META[f].label}</span>
                    <span className="font-mono text-[12px] text-faint">{countFor(f)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="label mb-2.5 text-muted">Research Goal</h2>
            <ul className="space-y-1.5">
              {GOAL_ORDER.map((g) => (
                <li key={g}>
                  <label className="flex cursor-pointer items-center gap-2 text-[14.5px]">
                    <input
                      type="radio"
                      name="goal"
                      checked={filters.goal === g}
                      onChange={() => setParam("goal", g)}
                      className="accent-[var(--color-teal)]"
                    />
                    <span className="flex-1">{GOAL_META[g].title}</span>
                    <span className="font-mono text-[12px] text-faint">
                      {apply(products, { ...filters, goal: g }).length}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-6">
            <label htmlFor="max-price" className="label mb-2.5 block text-muted">
              Max Price
            </label>
            <input
              id="max-price"
              type="range"
              min={30}
              max={PRICE_MAX}
              step={5}
              value={filters.max}
              onChange={(e) => setParam("max", e.target.value)}
              className="w-full accent-[var(--color-teal)]"
            />
            <p className="mt-1 font-mono text-[13px] text-muted">up to ${filters.max}</p>
          </section>

          <label className="flex cursor-pointer items-center gap-2 text-[14.5px]">
            <input
              type="checkbox"
              checked={filters.inStockOnly}
              onChange={(e) => setParam("stock", e.target.checked ? "1" : null)}
              className="accent-[var(--color-teal)]"
            />
            In Stock Only
          </label>

          {(filters.format || filters.goal || filters.inStockOnly || filters.max < PRICE_MAX) && (
            <button
              type="button"
              onClick={() => router.replace("/shop", { scroll: false })}
              className="mt-5 text-[14px] text-teal-dark underline underline-offset-2"
            >
              Clear All Filters
            </button>
          )}
        </aside>

        {/* Grid */}
        <div>
          <p className="mb-4 font-mono text-[13px] text-muted">
            {results.length} {results.length === 1 ? "result" : "results"}
          </p>

          {results.length === 0 ? (
            <div className="rounded-lg border border-line bg-surface p-10 text-center">
              <h2 className="t-title">Nothing matches all of those filters.</h2>
              {rescue ? (
                <>
                  <p className="mx-auto mt-2 max-w-[46ch] text-[15px] text-muted">
                    Drop <strong className="text-ink">{rescue.label}</strong> and{" "}
                    {rescue.count} {rescue.count === 1 ? "product" : "products"} match.
                  </p>
                  <button
                    type="button"
                    onClick={() => setParam(rescue.key, rescue.key === "max" ? String(PRICE_MAX) : null)}
                    className="btn-primary mt-5"
                  >
                    show those {rescue.count}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => router.replace("/shop", { scroll: false })}
                  className="btn-primary mt-5"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <ul className="grid gap-[18px] sm:grid-cols-2 xl:grid-cols-3">
              {results.map((p, i) => (
                <li key={p.slug}>
                  <ProductCard
                    product={p}
                    priority={i < 3}
                    sizes="(max-width: 640px) 90vw, (max-width: 1280px) 44vw, 300px"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
