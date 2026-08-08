export type Format = "vial" | "spray" | "capsule" | "supply";

export type Goal =
  | "recovery" // tissue repair, injury, joints
  | "metabolic" // weight, incretin pathways
  | "cognitive" // focus, mood, nootropic
  | "longevity" // cellular, mitochondrial, anti-aging
  | "skin" // dermal, hair, collagen
  | "immune"; // immune modulation, gut

export interface Tier {
  minQty: number;
  unitPrice: number;
  label?: "most popular" | "best value";
}

export interface ResearchArea {
  title: string;
  body: string;
}

/**
 * `copySource` records where `description` / `researchAreas` came from:
 *  - "live"     scraped verbatim from the existing upgradebiolabs.com PDP
 *  - "authored" written for this build because the live PDP had none
 * Authored copy is written in the same research-use register as the live copy
 * and should be reviewed by the client before publishing.
 */
export type CopySource = "live" | "authored";

/**
 * A selectable fill size. `tiers` mirrors the quantity ladder for that size.
 * `tiers: null` means the size exists but is not yet priced, and the UI hides
 * it rather than guessing a number.
 */
export interface ProductSize {
  /** Shown in the selector, e.g. "10mg" or "5mg / 5mg". */
  label: string;
  doseMg?: number;
  doseLabel?: string;
  tiers: Tier[] | null;
}

export interface Product {
  slug: string;
  name: string;
  format: Format;
  /** "solution" marks pre-mixed liquids that ship in a vial but need no reconstitution. */
  presentation?: "lyophilized" | "solution" | "topical";
  goals: Goal[];
  blend?: string[]; // component peptides, blends only
  /** Per-component strengths, index-aligned with `blend`. Client-confirmed
   *  breakdowns only: absent means we have not been given the split. */
  blendAmounts?: string[];
  doseMg?: number; // total mg - drives $/mg
  doseLabel?: string; // verbatim strength string from the source catalog
  volumeMl?: number; // sprays and liquids
  countCt?: number; // capsules
  purity: string;
  basePrice: number; // single-unit price - never a range
  compareAt?: number;
  tiers: Tier[];
  /** Present only where the SKU ships in more than one fill size. */
  sizes?: ProductSize[];
  coaUrl?: string;
  coaBatch?: string;
  refs?: string[]; // literature links shown on the PDP
  inStock: boolean;
  bestseller?: boolean;
  short: string;
  description: string;
  researchAreas: ResearchArea[];
  pairsWith?: string[]; // hand-picked cross-sells, by slug
  copySource: CopySource;
  image: string; // local regenerated asset
  sourceImage: string; // original upstream photo, kept for re-runs
}
