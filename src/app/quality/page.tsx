import type { Metadata } from "next";
import Link from "next/link";
import { products } from "@/data/products";
import CoaViewer from "@/components/product/CoaViewer";
import { isTested } from "@/lib/testing";

export const metadata: Metadata = {
  title: "Quality, testing and COA library",
  description:
    "How every batch is tested: identity by mass spectrometry, purity by HPLC, and net peptide content, plus endotoxin and heavy metals on vials. Documents published before you buy.",
  alternates: { canonical: "/quality" },
};

const STEPS = [
  {
    n: "01",
    title: "Identity",
    method: "mass spectrometry",
    body: "Confirms the molecule is the sequence on the label. This is the check that catches a mislabeled or substituted compound, and it is the one most suppliers skip.",
  },
  {
    n: "02",
    title: "Purity",
    method: "HPLC",
    body: "High-performance liquid chromatography separates the target peptide from truncated sequences and synthesis by-products. We publish the percentage, and it is at or above 99%.",
  },
  {
    n: "03",
    title: "Quantity",
    method: "net peptide content",
    body: "Tells you how much actual peptide is in the vial rather than salts and residual water. A vial can be 99% pure and still contain less peptide than the label claims without this figure.",
  },
  {
    n: "04",
    title: "Endotoxin",
    method: "LAL assay, vials",
    body: "Limulus amebocyte lysate testing for bacterial endotoxin, run on lyophilized vials. Reported in EU/mg so the result is comparable across batches and suppliers.",
  },
  {
    n: "05",
    title: "Heavy Metals",
    method: "ICP-MS, vials",
    body: "Vials are additionally screened for heavy metals by inductively coupled plasma mass spectrometry. This is the check that catches contamination introduced upstream in synthesis or handling, and most suppliers in this category do not run it.",
  },
];

export default function QualityPage() {
  // Supplies are not tested by us. The scrape left a COA URL on one of the
  // bacteriostatic waters, which would have listed it here while its own
  // product page correctly showed no testing at all.
  const withCoa = products.filter((p) => p.coaUrl && isTested(p));
  const withoutCoa = products.filter((p) => !p.coaUrl && isTested(p));
  const coaCount = withCoa.length;

  return (
    <div className="container-site py-12">
      <h1 className="t-display-lg">Quality &amp; Testing</h1>
      <p className="mt-3 max-w-[62ch] text-[16px] leading-relaxed text-muted">
        Every batch goes to an independent laboratory with no commercial
        interest in the outcome, and the result is published unedited before the
        batch goes on sale. Identity, purity and quantity are run on every
        format. Vials additionally carry an endotoxin assay and a heavy-metals
        screen.
      </p>

      <ol id="testing" className="mt-10 grid gap-6 md:grid-cols-2">
        {STEPS.map((s) => (
          <li key={s.n} className="card p-6">
            <p className="label text-faint">{s.n}</p>
            <h2 className="t-title mt-1">{s.title}</h2>
            <p className="mt-0.5 font-mono text-[13px] text-teal-dark">{s.method}</p>
            <p className="mt-3 text-[14.5px] leading-relaxed text-muted">{s.body}</p>
          </li>
        ))}
      </ol>

      <section id="coas" className="section-pad !pb-0">
        <h2 className="t-display-md">How To Read A COA</h2>
        <p className="mt-3 max-w-[62ch] text-[16px] leading-relaxed text-muted">
          Check these fields in this order. Identity tells you it is the right
          molecule. Purity should read at or above 99%. Net peptide content tells
          you how much of the vial is actually peptide. On a vial document you
          will also see endotoxin, which should read below 0.5 EU/mg, and a
          heavy-metals screen. If a supplier shows you purity alone, you are
          seeing one quarter of the picture.
        </p>
        <p className="mt-4 text-[16px] text-muted">
          {coaCount} of our {products.length} SKUs have a document published
          right now.
        </p>
      </section>

      {/* The COA library lives on this page rather than a separate route:
          "how we test" and "here are the results" are one argument, and
          splitting them made the visitor navigate to finish the thought. */}
      <section className="section-pad !pb-0">
        <h2 className="t-display-md">The COA Library</h2>
        <p className="mt-3 max-w-[62ch] text-[16px] leading-relaxed text-muted">
          Every document below is the unedited report returned by an independent
          laboratory. Open any of them before you buy.
        </p>

        <ul className="mt-6 overflow-hidden rounded-md border border-line-soft bg-surface">
          {withCoa.map((p) => (
            <li
              key={p.slug}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-3.5 last:border-b-0"
            >
              <div>
                <Link
                  href={`/product/${p.slug}`}
                  className="text-[15px] font-semibold hover:text-teal-dark"
                >
                  {p.name}
                </Link>
                <p className="data text-faint">
                  {p.format}
                  {p.doseLabel ? ` · ${p.doseLabel}` : ""} · {p.purity}
                </p>
              </div>
              <CoaViewer
                slug={p.slug}
                name={p.name}
                batch={p.coaBatch}
                className="shrink-0 text-[14px] font-semibold text-teal-dark hover:underline"
              >
                View COA &rarr;
              </CoaViewer>
            </li>
          ))}
        </ul>

        {withoutCoa.length > 0 && (
          <div className="mt-8">
            <h3 className="t-title">Awaiting Publication</h3>
            <p className="mt-1.5 text-[14.5px] text-muted">
              These SKUs do not have a document posted yet. Contact us and we
              will send the current batch report.
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {withoutCoa.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/product/${p.slug}`}
                    className="inline-block rounded-full border border-line px-3 py-1.5 text-[13.5px] hover:border-teal"
                  >
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
