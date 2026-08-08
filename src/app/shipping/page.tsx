import type { Metadata } from "next";
import ShippingAccordion from "@/components/product/ShippingAccordion";
import {
  SHIPPING_THRESHOLD,
  SHIPPING_FLAT,
  SHIPPING_EXPEDITED,
  SHIP_CUTOFF,
} from "@/lib/config";

export const metadata: Metadata = {
  title: "Shipping",
  description: `Same-day dispatch before ${SHIP_CUTOFF}, free over $${SHIPPING_THRESHOLD}, and shipment protection included at no cost.`,
  alternates: { canonical: "/shipping" },
};

const RATES = [
  { name: "Free Shipping", speed: `Orders over $${SHIPPING_THRESHOLD}`, price: "$0" },
  { name: "Standard Ground", speed: "3 to 7 days", price: `$${SHIPPING_FLAT}` },
  { name: "Expedited", speed: "1 to 3 days", price: `$${SHIPPING_EXPEDITED}` },
];

export default function ShippingPage() {
  return (
    <div className="container-site max-w-[820px] py-12">
      <h1 className="t-display-lg">Shipping</h1>
      <p className="mt-3 text-[16px] leading-relaxed text-muted">
        Order by {SHIP_CUTOFF} on a business day and it leaves the same day. Lost,
        damaged, or stolen packages are reshipped at no cost.
      </p>

      <ul className="mt-8 overflow-hidden rounded-md border border-line-soft bg-surface">
        {RATES.map((r) => (
          <li
            key={r.name}
            className="flex items-center justify-between gap-4 border-b border-line-soft px-5 py-4 last:border-b-0"
          >
            <div>
              <p className="text-[15px] font-semibold">{r.name}</p>
              <p className="text-[13.5px] text-muted">{r.speed}</p>
            </div>
            <p className="data text-[17px] font-semibold text-teal-dark">{r.price}</p>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <ShippingAccordion />
      </div>
    </div>
  );
}
