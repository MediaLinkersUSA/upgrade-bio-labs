import type { Product, Tier } from "@/data/types";

/** Cross-SKU bundle ladder. Counts DISTINCT compounds, never units. */
export const stackDiscount = (distinctCompounds: number) =>
  distinctCompounds >= 3 ? 0.2 : distinctCompounds >= 2 ? 0.15 : 0;

/**
 * The priced ladder for a specific fill.
 *
 * A SKU sold in more than one size carries a ladder per size, and those are
 * NOT interchangeable - TZ-2 is $115 at 10mg and $210 at 20mg. Anything that
 * turns a cart line into money has to go through here, or a customer who picks
 * the larger fill gets charged for the smaller one.
 */
export const tiersFor = (p: Product, size?: string | null): Tier[] => {
  if (!size) return p.tiers;
  const match = p.sizes?.find((s) => s.label === size);
  return match?.tiers?.length ? match.tiers : p.tiers;
};

/** The tier that applies at a given quantity, for the chosen fill. */
export const tierFor = (p: Product, qty: number, size?: string | null): Tier => {
  const tiers = tiersFor(p, size);
  let match = tiers[0];
  for (const t of tiers) if (qty >= t.minQty) match = t;
  return match;
};

export const unitPriceAt = (p: Product, qty: number, size?: string | null) =>
  tierFor(p, qty, size).unitPrice;

/** True when the SKU ships in more than one priced fill. */
export const hasPricedSizes = (p: Product) =>
  (p.sizes ?? []).filter((s) => s.tiers?.length).length > 1;

/** Always the single-unit price. Never a range. */
export const displayPrice = (p: Product) => p.basePrice;

/** Deepest saving on the ladder, as a whole percent. 0 when the SKU has no ladder. */
export const bestTierSaving = (p: Product) => {
  if (p.tiers.length < 2) return 0;
  const best = p.tiers[p.tiers.length - 1];
  const pct = Math.round((1 - best.unitPrice / p.basePrice) * 100);
  return pct > 0 ? pct : 0;
};

/** Quantity at which the deepest saving kicks in. */
export const bestTierQty = (p: Product) =>
  p.tiers.length ? p.tiers[p.tiers.length - 1].minQty : 1;

/** Deepest saving for an arbitrary ladder, as a whole percent. Lets callers
 *  that already resolved a specific size's tiers (e.g. a card's inline size
 *  picker) get the same "save X% at N+" math BuyBox uses, without re-deriving
 *  it against the wrong (default) ladder. */
export const bestSavingForTiers = (tiers: Tier[]) => {
  if (tiers.length < 2) return 0;
  const base = tiers[0].unitPrice;
  const best = tiers[tiers.length - 1];
  const pct = Math.round((1 - best.unitPrice / base) * 100);
  return pct > 0 ? pct : 0;
};

/** Lowest per-unit price across a SKU's priced sizes. Used on listing cards
 *  so a multi-size product can show "From $X" instead of quoting one size's
 *  price as if it were the default. */
export const fromPrice = (p: Product) => {
  const priced = (p.sizes ?? []).filter((s) => s.tiers?.length);
  if (!priced.length) return p.basePrice;
  return Math.min(...priced.map((s) => s.tiers![0].unitPrice));
};

/** Price per mg at the single-unit price. `override` lets a size-variant PDP
 *  pass the selected fill rather than the SKU's default one. */
export const perMg = (
  p: Product,
  override?: { basePrice?: number; doseMg?: number }
) => {
  const price = override?.basePrice ?? p.basePrice;
  const mg = override?.doseMg ?? p.doseMg;
  return mg && mg > 0 ? `$${(price / mg).toFixed(2)}/mg` : null;
};

export const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Tier label for display: "1", "3", "5+".
 *  Takes an explicit ladder so a size-specific one can be passed in. */
export const tierLabel = (tiers: Tier[], i: number) => {
  const t = tiers[i];
  if (!tiers[i + 1]) return `${t.minQty}+`;
  return String(t.minQty);
};
