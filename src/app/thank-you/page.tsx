import type { Metadata } from "next";
import Link from "next/link";
import ClearCartOnMount from "@/components/cart/ClearCartOnMount";
import { getOrder } from "@/lib/order-store";
import { money } from "@/lib/pricing";
import { SHIP_CUTOFF, SITE } from "@/lib/config";

export const metadata: Metadata = {
  title: "Thank you for your order",
  robots: { index: false, follow: false },
};

/** An order id makes this page different on every request. */
export const dynamic = "force-dynamic";

/**
 * Where the payment site returns the customer after a successful payment.
 *
 * The order id arrives as a query parameter, which means it is whatever the
 * customer's address bar says. So the order is re-read from the database and
 * the page shows what the database holds - never a status inferred from the
 * URL. Landing here is evidence the customer got through the payment page; it
 * is not evidence money moved, and only a server-to-server confirmation from
 * the payment site can settle that.
 *
 * In practice that distinction is invisible: the page reads as a thank-you
 * either way, and only says "confirming your payment" when the order has not
 * yet been marked paid.
 */
export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>;
}) {
  const { order_id } = await searchParams;
  const order = order_id ? await getOrder(order_id) : null;

  const dollars = (c: number) => money(c / 100);
  const paid = order?.status === "paid";

  return (
    <div className="container-site py-16">
      {/* They have paid, or are on the hook for a transfer. Either way the
          cart is spent and leaving it full invites a duplicate order. */}
      <ClearCartOnMount />

      <div className="mx-auto max-w-[62ch]">
        <div className="text-center">
          <p className="label text-teal-dark">Order Received</p>
          <h1 className="t-display-lg mt-3">Thank you. We have your order.</h1>
          <p className="mt-4 text-[16px] leading-relaxed text-muted">
            A receipt is on its way to your inbox. Orders placed before{" "}
            {SHIP_CUTOFF} on a business day ship the same day, and you will get
            a tracking number as soon as the label is created.
          </p>
        </div>

        {order ? (
          <div className="mt-10 rounded-md border border-line-soft bg-surface p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="t-title">Order Summary</h2>
              <p className="data text-[15px] font-bold text-teal-dark">
                {order.orderNumber}
              </p>
            </div>

            <ul className="mt-5 divide-y divide-line-soft border-y border-line-soft">
              {order.items.map((i, n) => (
                <li key={n} className="flex gap-3 py-3">
                  <p className="min-w-0 flex-1 text-[14.5px] leading-snug">
                    {i.name}
                    {i.size ? ` — ${i.size}` : ""}
                    <span className="data ml-2 text-faint">×{i.quantity}</span>
                  </p>
                  <p className="data shrink-0 text-[14px]">{dollars(i.lineCents)}</p>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-1.5 font-mono text-[14px]">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd>{dollars(order.subtotalCents)}</dd>
              </div>
              {order.discountCents > 0 && (
                <div className="flex justify-between text-teal-dark">
                  <dt>Discount</dt>
                  <dd>−{dollars(order.discountCents)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">Shipping</dt>
                <dd>
                  {order.shippingCents === 0 ? "Free" : dollars(order.shippingCents)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-line-soft pt-2 text-[16px] font-semibold">
                <dt>Total</dt>
                <dd>{dollars(order.totalCents)}</dd>
              </div>
            </dl>

            {order.shippingName && order.shippingAddress && (
              <div className="mt-6 border-t border-line-soft pt-5">
                <h3 className="label text-muted">Shipping to</h3>
                <address className="mt-2 text-[14.5px] not-italic leading-relaxed">
                  {order.shippingName}
                  <br />
                  {order.shippingAddress.line1}
                  {order.shippingAddress.line2 && (
                    <>
                      <br />
                      {order.shippingAddress.line2}
                    </>
                  )}
                  <br />
                  {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                  {order.shippingAddress.postal_code}
                </address>
              </div>
            )}

            {!paid && (
              <p className="mt-5 rounded-sm border border-line-soft bg-surface-2 px-4 py-3 text-[13.5px] leading-relaxed text-muted">
                We are confirming your payment now. This usually takes a moment,
                and nothing is required from you — you will get an email as soon
                as it clears.
              </p>
            )}
          </div>
        ) : (
          // No id, a bad one, or an order this store has no record of. Say so
          // rather than showing a confident confirmation of nothing.
          <div className="mt-10 rounded-md border border-line-soft bg-surface p-6 text-center">
            <p className="text-[15px] leading-relaxed text-muted">
              We could not pull up the details for this order. If you were
              charged, your order is safe — reply to your confirmation email or
              write to{" "}
              <a
                href={`mailto:${SITE.email}`}
                className="text-teal-dark hover:underline"
              >
                {SITE.email}
              </a>{" "}
              and we will find it.
            </p>
          </div>
        )}

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className="btn-primary">
            Keep Browsing
          </Link>
          <Link href="/quality#coas" className="btn-ghost">
            Browse COA Library
          </Link>
        </div>

        <p className="mt-8 text-center text-[13.5px] text-muted">
          Questions about this order? Email{" "}
          <a href={`mailto:${SITE.email}`} className="text-teal-dark hover:underline">
            {SITE.email}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
