import { SITE } from "./config";

/**
 * Checkout configuration, mirroring the live WooCommerce storefront.
 *
 * The live site takes three payment methods and gives $5 off the two that
 * settle outside the card networks. That discount is a real, customer-visible
 * line, not a fee waiver, so it is modelled as money off the total.
 */

export type PaymentMethodId = "card" | "zelle" | "cashapp";

export type PaymentMethod = {
  id: PaymentMethodId;
  label: string;
  /** Shown when the method is selected. */
  description: string;
  /** Where the money actually goes. Absent for card. */
  payTo?: string;
  /** Dollars off the order total for choosing this method. */
  discount: number;
  /** False for methods that settle after the order is placed. */
  instant: boolean;
};

/** Flat discount for paying by transfer instead of by card. */
export const OFFLINE_DISCOUNT = 5;

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "card",
    label: "Pay Online with Debit/Credit Card",
    // Says a redirect is coming. Cards are taken on our secure payment site,
    // not here, and a customer who is not expecting to change domain reads
    // that as the checkout having gone wrong.
    description:
      "You will be taken to our secure payment page to complete your card payment.",
    discount: 0,
    instant: true,
  },
  {
    id: "zelle",
    label: `Zelle (Use Zelle and Save $${OFFLINE_DISCOUNT})`,
    payTo: SITE.email,
    description: `Please send your Zelle payment to ${SITE.email}. Include only your order number in the memo section.`,
    discount: OFFLINE_DISCOUNT,
    instant: false,
  },
  {
    id: "cashapp",
    label: `CashApp (Use CashApp and Save $${OFFLINE_DISCOUNT})`,
    // Client-confirmed handle. Their own checkout page never shows it - it
    // only appears on the order-received screen after the order is placed,
    // which is why it could not be read by inspecting the checkout.
    payTo: "$upgradebio",
    description: `Submit your payment via Cash App to $upgradebio. Include only your order number in the note.`,
    discount: OFFLINE_DISCOUNT,
    instant: false,
  },
];

export const paymentMethod = (id: string): PaymentMethod =>
  PAYMENT_METHODS.find((m) => m.id === id) ?? PAYMENT_METHODS[0];

/** US states plus the military postal codes the live checkout offers. */
export const US_STATES: { code: string; name: string }[] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"],
  ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"],
  ["DE", "Delaware"], ["DC", "District of Columbia"], ["FL", "Florida"],
  ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
  ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"],
  ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
  ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"],
  ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"],
  ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
  ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
  ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
  ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"],
  ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"],
  ["WI", "Wisconsin"], ["WY", "Wyoming"],
  ["AA", "Armed Forces (AA)"], ["AE", "Armed Forces (AE)"],
  ["AP", "Armed Forces (AP)"],
].map(([code, name]) => ({ code, name }));

/**
 * Human-quotable order reference, e.g. UBL-7K3M-2QX9.
 *
 * Customers type this into a Zelle memo, so I and 1, O and 0 are excluded:
 * a transposed character means a payment nobody can match to an order.
 */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateOrderNumber(random: () => number = Math.random): string {
  const block = (n: number) =>
    Array.from({ length: n }, () => ALPHABET[Math.floor(random() * ALPHABET.length)]).join("");
  return `UBL-${block(4)}-${block(4)}`;
}
