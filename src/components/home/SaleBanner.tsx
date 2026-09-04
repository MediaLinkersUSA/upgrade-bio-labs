
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Inclusive. Checked client-side (the visitor's own clock) specifically so
// this stops showing itself after the 8th without needing a redeploy - the
// homepage has no `revalidate` export, so a server-side check here would
// only ever reflect whatever day this was last built, not today.
const SALE_START = new Date("2026-09-04T00:00:00");
const SALE_END = new Date("2026-09-08T23:59:59");

/**
 * Labor Day sale banner. Sits between Hero and the reviews rail (currently
 * invisible until a real review corpus exists - see ReviewsSection.tsx),
 * which is why this lands directly under the trust marquee visually.
 *
 * Text-only by design, replacing an earlier popup version of this same
 * promotion - simpler, always visible rather than a one-time interruption,
 * and no dismiss/session-tracking logic needed at all.
 */
export default function SaleBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const now = new Date();
    setVisible(now >= SALE_START && now <= SALE_END);
  }, []);

  if (!visible) return null;

  return (
    <section className="container-site">
      <div className="my-8 flex flex-col items-center gap-4 rounded-lg bg-navy px-6 py-7 text-center text-white sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="t-display-md">Labor Day Sale — 35% Off All Orders</p>
          <p className="mt-1.5 text-[15px] text-white/80">
            September 4–8. Use code{" "}
            <span className="font-mono font-bold text-white">LABORDAY35</span> at checkout.
          </p>
        </div>
        <Link href="/shop" className="btn-primary shrink-0">
          Shop Now <span aria-hidden>&rarr;</span>
        </Link>
      </div>
    </section>
  );
}
