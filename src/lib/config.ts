/** Free-shipping threshold. Referenced by the announcement bar, cart drawer
 *  progress mechanic, logistics section, PDP trust row, and checkout. */
export const SHIPPING_THRESHOLD = 200;

/** Standard ground, charged below the threshold. 3-7 business days. */
export const SHIPPING_FLAT = 15;

/** Expedited, always charged. 1-3 business days. */
export const SHIPPING_EXPEDITED = 25;

export type ShippingMethodId = "standard" | "expedited";

export type ShippingMethod = {
  id: ShippingMethodId;
  label: string;
  /** Delivery window, shown under the label at checkout. */
  eta: string;
  price: number;
  /** Standard ground is what the free-shipping threshold buys. Expedited is
   *  an upgrade and is always charged. */
  freeOverThreshold: boolean;
  /** Business days, for the delivery estimate shown at checkout. */
  days: [number, number];
};

export const SHIPPING_METHODS: ShippingMethod[] = [
  {
    id: "standard",
    label: "Standard Ground",
    eta: "3 to 7 business days",
    price: SHIPPING_FLAT,
    freeOverThreshold: true,
    days: [3, 7],
  },
  {
    id: "expedited",
    label: "Expedited",
    eta: "1 to 3 business days",
    price: SHIPPING_EXPEDITED,
    freeOverThreshold: false,
    days: [1, 3],
  },
];

export const shippingMethod = (id: string): ShippingMethod =>
  SHIPPING_METHODS.find((m) => m.id === id) ?? SHIPPING_METHODS[0];

/** What a method actually costs on a given order subtotal. */
export const shippingCost = (m: ShippingMethod, afterDiscount: number) =>
  m.freeOverThreshold && afterDiscount >= SHIPPING_THRESHOLD ? 0 : m.price;

/** Same-day cutoff. Keep the label and the hour in step: the announcement bar
 *  counts down to the hour and prints the label. */
export const SHIP_CUTOFF = "2pm EST";
export const SHIP_CUTOFF_HOUR_ET = 14;

export const SITE = {
  name: "Upgrade Bio Labs",
  domain: "upgradebiolabs.com",
  url: "https://upgradebiolabs.com",
  phone: "(800) 564-2330",
  email: "cs@upgradebiolabs.com",
} as const;

export const FORMAT_META = {
  vial: {
    label: "Vials",
    title: "Lyophilized Vials",
    sub: "Reconstitute to your own protocol. Widest compound selection, lowest cost per mg.",
    color: "var(--color-vial)",
    text: "var(--color-vial)",
    wash: "var(--color-vial-wash)",
  },
  spray: {
    label: "Sprays",
    title: "Sprays",
    sub: "Pre-mixed, measured actuation. No reconstitution, no needles, no BAC water.",
    color: "var(--color-spray)",
    // brand teal measures 3.02 on white, so text uses the darkened step
    text: "var(--color-teal-dark)",
    wash: "var(--color-spray-wash)",
  },
  capsule: {
    label: "Capsules",
    title: "Capsules",
    sub: "Pre-dosed oral. The simplest to handle and the simplest to store.",
    color: "var(--color-capsule)",
    text: "var(--color-capsule-text)",
    wash: "var(--color-capsule-wash)",
  },
  supply: {
    label: "Supplies",
    title: "Supplies",
    sub: "Bacteriostatic water and reconstitution consumables.",
    color: "var(--color-supply)",
    text: "#4B7185",
    wash: "var(--color-supply-wash)",
  },
} as const;

export const GOAL_META = {
  recovery: { title: "Recovery & Repair", sub: "tendon, ligament, gut lining", tint: "var(--color-goal-recovery)" },
  metabolic: { title: "Weight & Metabolic", sub: "incretin pathways, body composition", tint: "var(--color-goal-metabolic)" },
  cognitive: { title: "Focus & Mood", sub: "nootropic, anxiolytic, sleep", tint: "var(--color-goal-cognitive)" },
  longevity: { title: "Longevity & Energy", sub: "mitochondrial, cellular, NAD", tint: "var(--color-goal-longevity)" },
  skin: { title: "Skin & Hair", sub: "collagen, dermal, follicle", tint: "var(--color-goal-skin)" },
  immune: { title: "Immune & Gut", sub: "modulation, barrier integrity", tint: "var(--color-goal-immune)" },
} as const;

export const GOAL_ORDER = ["recovery", "metabolic", "cognitive", "longevity", "skin", "immune"] as const;
