import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/config";

export const metadata: Metadata = {
  title: "Returns",
  description:
    "Unopened vials and capsules can be returned within 14 days. Sprays are final sale. Damaged, lost, or stolen shipments are reshipped at no cost.",
  alternates: { canonical: "/returns" },
};

export default function ReturnsPage() {
  return (
    <div className="container-site max-w-[820px] py-12">
      <h1 className="t-display-lg">Returns</h1>
      <div className="mt-4 space-y-4 text-[16px] leading-relaxed text-muted">
        <p>
          Unopened vials and capsules can be returned if unused within 14 days of
          delivery. Because these are research materials whose integrity cannot
          be verified once a seal is broken, anything opened cannot be returned.
        </p>
        <p>
          All sprays are final sale and cannot be returned.
        </p>
        <p>
          If a shipment arrives damaged, arrives short, or does not arrive at
          all, shipment protection covers it. We reship at no cost, with no claim
          form and no deductible. Tell us within 14 days of the delivery date.
        </p>
        <p>
          To start a return or report a problem, email{" "}
          <a href={`mailto:${SITE.email}`} className="text-teal-dark hover:underline">
            {SITE.email}
          </a>{" "}
          with your order number.
        </p>
      </div>
      <Link href="/contact" className="btn-primary mt-8">
        Contact Support
      </Link>
    </div>
  );
}
