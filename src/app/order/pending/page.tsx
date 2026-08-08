import type { Metadata } from "next";
import Link from "next/link";
import { paymentMethod, OFFLINE_DISCOUNT } from "@/lib/checkout";
import { SITE, SHIP_CUTOFF } from "@/lib/config";

export const metadata: Metadata = {
  title: "Order placed - payment pending",
  robots: { index: false, follow: false },
};

/**
 * Shown after a Zelle or CashApp order.
 *
 * The order exists but nothing has been paid, so this page has one job: make
 * the reference number impossible to miss and state plainly what has to happen
 * next. Everything else is secondary.
 */
export default async function PendingPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; method?: string }>;
}) {
  const { ref, method } = await searchParams;
  const pm = paymentMethod(String(method ?? ""));

  return (
    <div className="container-site max-w-[680px] py-16">
      <p className="label text-teal-dark">Order Placed</p>
      <h1 className="t-display-lg mt-2">Now send your payment.</h1>
      <p className="mt-3 text-[16px] leading-relaxed text-muted">
        Your order is reserved. We ship as soon as the payment clears, and
        orders confirmed before {SHIP_CUTOFF} go out the same business day.
      </p>

      {ref && (
        <div className="mt-8 rounded-md border-2 border-dashed border-teal bg-wash px-6 py-6 text-center">
          <p className="label text-muted">Your Order Number</p>
          <p className="data mt-2 text-[30px] font-bold tracking-[0.04em] text-teal-dark">
            {ref}
          </p>
          <p className="mt-2 text-[13.5px] text-muted">
            Put this in the payment memo. Nothing else.
          </p>
        </div>
      )}

      {/* Mirrors the live store's order-received layout: destination and
          reference on their own lines, because those are the two things the
          customer has to copy correctly for the payment to be matched. */}
      <div className="mt-8 rounded-md border border-line-soft bg-surface p-6">
        <h2 className="t-title">
          Payment Instructions ({pm.id === "zelle" ? "Zelle" : "Cash App"})
        </h2>

        <dl className="mt-4 space-y-3">
          <div>
            <dt className="label text-muted">
              Submit your payment via {pm.id === "zelle" ? "Zelle" : "Cash App"} to
            </dt>
            <dd className="data mt-1 text-[19px] font-bold text-teal-dark">
              {pm.payTo}
            </dd>
          </div>
          {ref && (
            <div>
              <dt className="label text-muted">
                Order number to use in the {pm.id === "zelle" ? "memo" : "note"}
              </dt>
              <dd className="data mt-1 text-[19px] font-bold text-teal-dark">{ref}</dd>
            </div>
          )}
        </dl>

        <p className="mt-4 text-[14px] leading-relaxed text-muted">
          Your total already reflects the ${OFFLINE_DISCOUNT} discount for paying
          this way. Payments without an order number take longer to match and
          delay the shipment, so please include it exactly as shown.
        </p>
      </div>

      <p className="mt-8 text-[15px] text-muted">
        A confirmation has been sent to your email. Anything unclear, reply to it
        or write to{" "}
        <a href={`mailto:${SITE.email}`} className="text-teal-dark hover:underline">
          {SITE.email}
        </a>
        .
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/shop" className="btn-primary">
          Continue Shopping
        </Link>
        <Link href="/contact" className="btn-ghost">
          Contact Support
        </Link>
      </div>
    </div>
  );
}
