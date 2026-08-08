import { products } from "@/data/products";

/**
 * Suspense fallback for the collection grid.
 *
 * ShopBrowser reads `useSearchParams`, so it only renders on the client. An
 * empty placeholder let the page collapse to nothing and then snap to full
 * height on hydration, which measured 0.68 CLS. This mirrors the real layout
 * closely enough that the swap costs no shift.
 */
export default function ShopSkeleton() {
  return (
    <div className="container-site py-10" aria-hidden>
      <header className="mb-7">
        <h1 className="t-display-lg">All Peptides</h1>
        <p className="mt-2 text-[15px] text-muted">
          {products.length} compounds across vials, sprays, and capsules.
          Every batch third-party tested.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-2">
          {["all", "vials", "sprays", "capsules", "supplies"].map((t) => (
            <li
              key={t}
              className="rounded-full border border-line px-4 py-2 text-[14px] font-medium text-transparent"
            >
              {t}
            </li>
          ))}
        </ul>
        <div className="h-[38px] w-[150px] rounded-full border border-line" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <div className="hidden h-[520px] rounded-md bg-surface-2 lg:block" />
        <div>
          <p className="mb-4 font-mono text-[13px] text-transparent">Loading</p>
          <ul className="grid gap-[18px] sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <li
                key={i}
                className="h-[501px] rounded-md border border-line-soft bg-surface"
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
