import { Resend } from "resend";
import { money } from "./pricing";

/**
 * The only email this app sends directly - everything else (order
 * confirmations) comes from WooCommerce's own native notifications, per
 * lib/woocommerce.ts. This one exists because it has to be conditional
 * (only when a research-site referral places an order) and go to specific
 * internal addresses, neither of which WooCommerce's blanket admin-email
 * setting can do.
 *
 * RESEND_API_KEY must be set, and the "from" domain must be verified in
 * Resend's dashboard (SPF/DKIM records added to DNS) before this will
 * actually deliver - see the setup notes in the PR this shipped with.
 */
const RESEARCH_REF_RECIPIENTS = ["lisa@upgradebiolabs.com", "service@medialinkers.com"];

export async function sendResearchRefNotification(input: {
  orderNumber: string;
  email: string;
  totalCents: number;
  items: string[];
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[email] RESEND_API_KEY not set - research-ref notification not sent");
    return;
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: "Upgrade Bio Labs <orders@upgradebiolabs.com>",
    to: RESEARCH_REF_RECIPIENTS,
    subject: `Research referral order - ${input.orderNumber}`,
    text: [
      `A visitor referred from peptideswellnessresearch.com just placed an order.`,
      ``,
      `Order: ${input.orderNumber}`,
      `Customer email: ${input.email}`,
      `Total: ${money(input.totalCents / 100)}`,
      `Items:`,
      ...input.items.map((i) => `  - ${i}`),
    ].join("\n"),
  });

  if (error) {
    console.error("[email] research-ref notification failed", error);
  }
}
