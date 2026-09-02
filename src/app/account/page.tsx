"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { byFormat, bestsellers, products } from "@/data/products";
import { GOAL_META, GOAL_ORDER } from "@/lib/config";
import { useCart } from "@/components/cart/CartProvider";
import FormatIcon from "@/components/ui/FormatIcon";
import Logo from "./Logo";

/** Six items. The live site carries about twelve, including a duplicated
 *  "COA's" and three overlapping testing-protocol entries. */
const NAV = [
  { href: "/shop", label: "Shop", mega: true },
  { href: "/formats", label: "Formats" },
  { href: "/quality", label: "Quality" },
  { href: "/partner", label: "Partner" },
  { href: "/contact", label: "Contact" },
];

const COLUMNS = (["vial", "spray", "capsule"] as const).map((f) => ({
  format: f,
  href: `/shop?format=${f}`,
  title: f === "vial" ? "Vials" : f === "spray" ? "Sprays" : "Capsules",
  items: byFormat(f)
    .filter((p) => p.inStock)
    .sort((a, b) => Number(!!b.bestseller) - Number(!!a.bestseller))
    .slice(0, 6),
}));

export default function Nav() {
  const { count, mounted, setOpen } = useCart();
  const [mega, setMega] = useState(false);
  const [mobile, setMobile] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const openMega = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMega(true);
  };
  const closeMega = () => {
    closeTimer.current = setTimeout(() => setMega(false), 120);
  };

  return (
    <header
      // top-10 clears the sticky announcement bar (h-10) that sits above it.
      className="site-nav sticky top-10 z-40 border-b border-line bg-[rgba(242,248,250,0.86)] backdrop-blur-xl"
      onKeyDown={(e) => e.key === "Escape" && setMega(false)}
    >
      <div className="container-site flex h-16 items-center justify-between gap-6">
        <Link href="/">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-7">
            {NAV.map((item) => (
              <li
                key={item.href}
                onMouseEnter={item.mega ? openMega : undefined}
                onMouseLeave={item.mega ? closeMega : undefined}
              >
                <Link
                  href={item.href}
                  className="text-[15px] font-medium text-ink transition-colors hover:text-teal-dark"
                  aria-expanded={item.mega ? mega : undefined}
                  onFocus={item.mega ? openMega : undefined}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Account and cart are the two the client reported people hunting
            for, so they carry a visible bordered chip rather than sitting as
            bare icons. Search and menu stay quiet so the pair reads first. */}
        <div className="flex items-center gap-1.5">
          <Link
            href="/shop"
            aria-label="Search the catalog"
            className="rounded-full p-2.5 text-muted hover:bg-surface hover:text-ink"
          >
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden>
              <circle cx="8" cy="8" r="5.2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 12l3.4 3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </Link>
          <a
            href="https://old.upgradebiolabs.com/my-account/"
            aria-label="Account"
            className="hidden items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2.5 text-ink transition-colors hover:border-teal hover:text-teal-dark sm:flex"
          >
            <svg width="21" height="21" viewBox="0 0 18 18" fill="none" aria-hidden>
              <circle cx="9" cy="6.2" r="3.1" stroke="currentColor" strokeWidth="1.6" />
              <path d="M3.4 15.2a5.8 5.8 0 0 1 11.2 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span className="hidden text-[14.5px] font-semibold lg:inline">Account</span>
          </a>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2.5 text-ink transition-colors hover:border-teal hover:text-teal-dark"
            aria-label={mounted ? `Cart, ${count} items` : "Cart"}
          >
            <svg width="21" height="21" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path d="M2.4 3h1.9l1.6 8.4h7.6l1.5-6.1H5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="7.4" cy="14.6" r="1.2" fill="currentColor" />
              <circle cx="12.8" cy="14.6" r="1.2" fill="currentColor" />
            </svg>
            <span className="hidden text-[14.5px] font-semibold lg:inline">Cart</span>
            {/* Gated on `mounted`: rendering the real count on the server would
                mismatch the hydrated client cart. */}
            {mounted && count > 0 && (
              <span className="data absolute -right-1 -top-1 flex h-[21px] min-w-[21px] items-center justify-center rounded-full bg-teal px-1 text-[12px] font-bold leading-none text-white">
                {count}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMobile((v) => !v)}
            aria-label="Menu"
            aria-expanded={mobile}
            className="rounded-full p-2.5 text-ink hover:bg-surface lg:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden>
              <path d="M2.5 5h13M2.5 9h13M2.5 13h13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mega menu: the nav doing merchandising work. */}
      {mega && (
        <div
          className="absolute inset-x-0 top-full hidden border-b border-line bg-surface shadow-lift lg:block"
          onMouseEnter={openMega}
          onMouseLeave={closeMega}
        >
          <div className="container-site grid grid-cols-4 gap-8 py-8">
            {COLUMNS.map((col) => (
              <div key={col.format}>
                <Link
                  href={col.href}
                  className="label mb-3 flex items-center gap-2 text-teal-dark hover:underline"
                >
                  <FormatIcon format={col.format} size={13} />
                  {col.title}
                </Link>
                <ul className="space-y-1.5">
                  {col.items.map((p) => (
                    <li key={p.slug}>
                      <Link
                        href={`/product/${p.slug}`}
                        className="text-[14px] text-ink hover:text-teal-dark"
                      >
                        {p.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <p className="label mb-3 text-teal-dark">By Research Goal</p>
              <ul className="space-y-1.5">
                {GOAL_ORDER.map((g) => (
                  <li key={g}>
                    <Link
                      href={`/shop?goal=${g}`}
                      className="text-[14px] text-ink hover:text-teal-dark"
                    >
                      {GOAL_META[g].title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Mobile drawer */}
      {mobile && (
        <div className="border-b border-line bg-surface lg:hidden">
          <div className="container-site py-4">
            <ul className="space-y-3">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobile(false)}
                    className="text-[16px] font-medium"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {COLUMNS.map((c) => (
                <Link
                  key={c.format}
                  href={c.href}
                  onClick={() => setMobile(false)}
                  className="label flex flex-col items-center gap-1.5 rounded-sm border border-line py-3 text-teal-dark"
                >
                  <FormatIcon format={c.format} size={16} />
                  {c.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
