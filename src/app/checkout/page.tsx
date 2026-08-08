import type { Metadata } from "next";
import CheckoutForm from "@/components/checkout/CheckoutForm";
import { canTakeOfflineOrders } from "@/lib/order-capabilities";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your order. Card, Zelle, or CashApp.",
  alternates: { canonical: "/checkout" },
  // A cart-bound page has nothing to index and should never appear in search.
  robots: { index: false, follow: false },
};

/** The schema probe has to run per request, not at build time. */
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  // Resolved on the server so the payment options are correct in the first
  // paint - a client-side check would flash Zelle and CashApp and then remove
  // them, which reads as the site taking an option away.
  // Now only false when there is no database configured at all.
  const offlineAvailable = canTakeOfflineOrders();
  return <CheckoutForm offlineAvailable={offlineAvailable} />;
}
