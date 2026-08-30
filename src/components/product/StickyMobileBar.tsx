"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Product } from "@/data/types";
import { money } from "@/lib/pricing";
import { useCart } from "@/components/cart/CartProvider";

/** Below 1024px the buy box unsticks, so this takes over past the hero. */
export default function StickyMobileBar({ product: p }: { product: Product }) {
  // `product` arrives already live-priced from the server - see BuyBox.tsx
  // for the same note.

  const { add } = useCart();
  const [show, setShow] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    // Observe the whole hero block, not a zero-height sentinel. A zero-height
    // target never has an intersecting phase, so a fast scroll goes from
    // "below the viewport, not intersecting" straight to "above it, not
    // intersecting" and no threshold is ever crossed, so the callback never
    // fires. A full-height block cannot be skipped that way.
    const hero = document.getElementById("pdp-hero");
    if (!hero) return;
    const io = new IntersectionObserver(
      ([entry]) =>
        setShow(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0),
      { threshold: 0 }
    );
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  return (
    <AnimatePresence>
      {show && p.inStock && (
        <motion.div
          initial={reduce ? { opacity: 0 } : { y: "100%" }}
          animate={reduce ? { opacity: 1 } : { y: 0 }}
          exit={reduce ? { opacity: 0 } : { y: "100%" }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line-soft bg-surface shadow-pop lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex h-16 items-center gap-3 px-4">
            <div className="relative h-11 w-11 shrink-0">
              <Image src={p.image} alt="" fill sizes="44px" className="object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold">{p.name}</p>
              <p className="font-mono text-[13px] text-muted">{money(p.basePrice)}</p>
            </div>
            <button
              type="button"
              onClick={() => add(p.slug)}
              className="btn-primary px-5 py-3 text-[14px]"
            >
              Add To Cart
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
