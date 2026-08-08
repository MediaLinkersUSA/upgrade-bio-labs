import type { Metadata } from "next";
import Link from "next/link";
import { products } from "@/data/products";

export const metadata: Metadata = {
  title: "About us",
  description:
    "Upgrade Bio Labs supplies US-sourced research peptides with batch-level third-party testing published before purchase.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="container-site py-12">
      <h1 className="t-display-lg">About Us</h1>
      <div className="mt-4 max-w-[62ch] space-y-4 text-[16px] leading-relaxed text-muted">
        <p>
          Upgrade Bio Labs supplies research peptides to laboratories,
          clinicians, and independent researchers in the United States. Synthesis
          and fill both happen domestically: our vials are made in Arizona, and
          our sprays and capsules are made in Texas. We do not repackage overseas
          bulk lots, which is why every batch can be traced from synthesis through
          to the order it shipped in.
        </p>
        <p>
          The catalog runs to {products.length} compounds across lyophilized
          vials, sprays, and capsules. Every batch is tested by an independent
          laboratory for identity, purity, and net peptide content, with vials
          additionally screened for endotoxin and heavy metals, and we publish
          the document before the batch goes on sale rather than producing it on
          request.
        </p>
        <p>
          Everything sold here is for laboratory research use only. It is not for
          human or veterinary consumption, and we will not supply anyone who
          indicates otherwise.
        </p>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/quality" className="btn-primary">
          How We Test
        </Link>
        <Link href="/shop" className="btn-ghost">
          Browse The Catalog
        </Link>
      </div>
    </div>
  );
}
