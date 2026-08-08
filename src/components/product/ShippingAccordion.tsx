"use client";

import { useState } from "react";
import {
  SHIPPING_THRESHOLD,
  SHIPPING_FLAT,
  SHIPPING_EXPEDITED,
  SHIP_CUTOFF,
} from "@/lib/config";

const ROWS = [
  {
    q: "When Does It Ship?",
    a: `Orders placed before ${SHIP_CUTOFF} on a business day leave the same day.`,
  },
  {
    q: "What Does Shipping Cost?",
    a: `All orders over $${SHIPPING_THRESHOLD} ship free. Standard ground is $${SHIPPING_FLAT} and arrives in 3 to 7 days. Expedited is $${SHIPPING_EXPEDITED} and arrives in 1 to 3 days. Your cart shows exactly how far you are from the free threshold.`,
  },
  {
    q: "How Is It Packaged?",
    a: "Protective packaging on every order, and nothing on the outer box identifies the contents.",
  },
  {
    q: "What If It Arrives Damaged?",
    a: "Shipment protection is included at no cost. Lost, damaged, or stolen packages are reshipped with no claim form and no deductible.",
  },
  {
    q: "Can I Return It?",
    a: "All sprays are final sale. Unopened vials and capsules can be returned if unused within 14 days of delivery.",
  },
];

export default function ShippingAccordion() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <ul className="overflow-hidden rounded-md border border-line-soft bg-surface">
      {ROWS.map((r, i) => {
        const isOpen = open === i;
        return (
          <li key={r.q} className="border-b border-line-soft last:border-b-0">
            <h3>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={`ship-panel-${i}`}
                className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left"
              >
                <span className="text-[15px] font-semibold">{r.q}</span>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 16 16"
                  aria-hidden
                  className="shrink-0 text-muted transition-transform duration-[220ms] ease-[var(--ease-out)]"
                  style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
                >
                  <path d="M3.5 6l4.5 4.5L12.5 6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </h3>
            <div id={`ship-panel-${i}`} hidden={!isOpen} className="px-4 pb-4">
              <p className="text-[14.5px] leading-relaxed text-muted">{r.a}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
