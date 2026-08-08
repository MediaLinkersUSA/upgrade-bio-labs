import type { Format, Product } from "@/data/types";

export type TestStep = { n: string; title: string; method: string };

/**
 * What each format is actually tested for.
 *
 * Vials carry the full five-check panel. Sprays and capsules are tested for
 * identity, purity and quantity only: no endotoxin assay and no heavy-metals
 * screen is run on those lines, so nothing on the site may claim otherwise.
 * Supplies (bacteriostatic water) are not tested by us at all and get no
 * testing panel and no COA.
 */
export function testStepsFor(format: Format, purity = "≥99%"): TestStep[] {
  if (format === "supply") return [];

  const base: TestStep[] = [
    { n: "01", title: "Identity", method: "mass spec" },
    { n: "02", title: "Purity", method: `HPLC ${purity}` },
    { n: "03", title: "Quantity", method: "net peptide content" },
  ];

  if (format === "vial") {
    base.push(
      { n: "04", title: "Endotoxin", method: "LAL assay" },
      { n: "05", title: "Heavy Metals", method: "ICP-MS" }
    );
  }

  return base;
}

/** Whether a product carries a testing panel and a certificate at all. */
export function isTested(p: Pick<Product, "format">) {
  return p.format !== "supply";
}
