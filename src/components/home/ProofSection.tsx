import Link from "next/link";
import { products } from "@/data/products";
import { isTested } from "@/lib/testing";
import Reveal from "@/components/ui/Reveal";
import RuleDraw from "./RuleDraw";

const STEPS = [
  { n: "01", title: "Identity", method: "mass spec" },
  { n: "02", title: "Purity", method: "HPLC ≥99%" },
  { n: "03", title: "Quantity", method: "net peptide content" },
  { n: "04", title: "Endotoxin", method: "LAL assay, vials" },
  { n: "05", title: "Heavy Metals", method: "ICP-MS, vials" },
];

const ORIGIN = [
  { title: "Sourced And Filled In The USA", body: "Vials are made in Arizona, sprays and capsules in Texas. Nothing is repackaged from an overseas bulk lot." },
  { title: "Discreet, Protective Packaging", body: "Every order ships protected, and nothing on the outer box identifies the contents." },
  { title: "Batch-Traceable From Synthesis To Doorstep", body: "Every vial carries a batch number that resolves to a published document." },
];

export default function ProofSection() {
  // Supplies are excluded from both halves of the ratio: we do not test them,
  // so counting them would understate the share of the catalog that is covered.
  const testable = products.filter(isTested);
  const coaCount = testable.filter((p) => p.coaUrl).length;

  return (
    <section id="proof" className="section-pad section-round bg-surface">
      <div className="container-site">
        <Reveal className="mb-10 hidden md:block">
          <h2 className="t-display-md">The Receipts</h2>
          <p className="mt-2 text-[15px] text-muted">Every batch. Published before you buy.</p>
        </Reveal>

        {/* a) testing pipeline. Hidden on phones: the four-step rule plus its
            nodes needs horizontal room to read as a pipeline, and stacked it is
            just four more headings before the proof panel. */}
        <div className="relative hidden md:block">
          <div className="absolute left-0 right-0 top-[14px] hidden h-px bg-line md:block" aria-hidden>
            <RuleDraw />
          </div>

          <ol className="grid gap-7 md:grid-cols-5">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.n} delay={i * 0.08} className="relative">
                <span
                  className="mb-4 hidden h-[9px] w-[9px] rounded-full bg-teal md:block"
                  style={{ marginTop: "10px" }}
                  aria-hidden
                />
                <p className="label text-faint">{s.n}</p>
                <h3 className="t-title mt-1">{s.title}</h3>
                <p className="mt-1 text-[13.5px] text-muted">{s.method}</p>
              </Reveal>
            ))}
          </ol>
        </div>

        {/* b) a real COA */}
        <Reveal className="mt-12 grid items-center gap-8 rounded-md border border-line bg-surface-2 p-6 md:grid-cols-[1.1fr_1fr] md:p-8">
          <div>
            <p className="label text-teal-dark">Certificate Of Analysis</p>
            <h3 className="t-display-md mt-3">
              Every vial carries a batch number.
            </h3>
            <p className="mt-3 max-w-[46ch] text-[15px] leading-relaxed text-muted">
              Every batch number resolves to a document like this one: identity,
              purity and net peptide content on every format, plus endotoxin and
              heavy metals on vials, signed by the testing lab. {coaCount} of our{" "}
              {testable.length} SKUs have one published right now.
            </p>
            <Link href="/quality#coas" className="btn-primary mt-6">
              Browse The Full COA Library <span aria-hidden>&rarr;</span>
            </Link>
          </div>

          <figure className="overflow-hidden rounded-md border border-line bg-surface">
            <figcaption className="flex items-center justify-between border-b border-line-soft px-4 py-3">
              <span className="label text-muted">Certificate Of Analysis</span>
              <span className="label rounded-full bg-wash px-2 py-1.5 text-teal-dark">
                third-party
              </span>
            </figcaption>
            <dl className="divide-y divide-line-soft font-mono text-[13px]">
              {[
                ["compound", "BPC-157"],
                ["appearance", "White lyophilized powder"],
                ["purity (HPLC)", "99.4%"],
                ["net peptide", "10.0 mg"],
                ["endotoxin", "< 0.5 EU/mg"],
                ["heavy metals", "Pass"],
              ].map(([k, v], i) => (
                <div key={k} className="flex items-center justify-between px-4 py-2.5">
                  <dt className="text-muted">{k}</dt>
                  <dd className={i >= 2 ? "rounded-full bg-wash px-2 py-1 text-teal-dark" : ""}>
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="border-t border-line-soft px-4 py-2.5 text-[12px] text-faint">
              Illustrative layout. Live documents are linked from each product page.
            </p>
          </figure>
        </Reveal>

        {/* c) origin and handling */}
        <ul className="mt-10 grid gap-[18px] md:grid-cols-3">
          {ORIGIN.map((o, i) => (
            <Reveal as="li" key={o.title} delay={i * 0.06} className="card p-5">
              <h3 className="t-title">{o.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{o.body}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
