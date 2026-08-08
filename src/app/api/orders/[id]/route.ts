import { NextResponse } from "next/server";
import { getOrder } from "@/lib/order-store";

/**
 * Order lookup for the payment site.
 *
 * The payment page is handed an order id and nothing else, and its amount
 * field currently starts empty for the customer to fill in - which means an
 * $80 order can be paid with $1 and still come back marked complete. This is
 * the endpoint that closes that: the payment page can read the real total and
 * render it read-only.
 *
 * Deliberately minimal. The uuid in the URL is the only credential, so this
 * returns what is needed to charge the right amount and nothing that would
 * matter if a link were shared - no email, no address, no line items. Those
 * stay behind the admin dashboard.
 */

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const order = await getOrder(id);

  if (!order) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      order_id: order.id,
      order_number: order.orderNumber,
      // Cents is the authoritative figure; `amount` is the same number in
      // dollars so the payment form can drop it straight into its field.
      amount_cents: order.totalCents,
      amount: (order.totalCents / 100).toFixed(2),
      currency: "usd",
      status: order.status,
      payment_method: order.paymentMethod,
    },
    {
      headers: {
        // Cross-origin: the payment site is a different domain.
        "Access-Control-Allow-Origin": "*",
        // A total that a payment page is about to charge must never be served
        // from a cache.
        "Cache-Control": "no-store",
      },
    }
  );
}
