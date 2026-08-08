import { NextResponse } from "next/server";
import { getOrder } from "@/lib/order-store";

/**
 * Order lookup for the UBL Stripe plugin.
 *
 * This path is not ours by choice - the plugin hardcodes it. Its payment.js
 * does, on page load:
 *
 *     fetch(`${blStripe.mainSite}/wp-json/ubl-stripe/v1/order-details?order_id=${oid}`)
 *
 * and `mainSite` is configured as https://upgradebiolabs.com/ - the domain
 * this site takes over at cutover. So rather than asking anyone to change the
 * WordPress plugin, we simply answer at the address it already calls. It is a
 * WordPress-shaped URL served by Next.js, which looks odd until you know that.
 *
 * Given {customer, total} the plugin fills its amount field, shows an order
 * summary, and auto-submits after two seconds - the customer never types or
 * sees an amount they could change. That is the point: the total comes from
 * our database, not from a form field or a query string.
 *
 * Until the domain moves, `mainSite` still resolves to the old WooCommerce
 * site, this endpoint is never called, and the `amount` query parameter on the
 * redirect is what makes the total right. Both paths are live so the cutover
 * needs no coordination.
 */

export const dynamic = "force-dynamic";

const fail = (error: string, status: number) =>
  NextResponse.json(
    { error },
    { status, headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } }
  );

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("order_id") ?? "";

  // Same wording and status as the WooCommerce endpoint this replaces, so the
  // plugin's own error handling behaves identically.
  if (!id) return fail("Invalid order ID", 400);

  const order = await getOrder(id);
  if (!order) return fail("Invoice not found", 404);

  // A paid order must never auto-submit again - the plugin would happily open
  // a second Stripe session and charge twice.
  if (order.status === "paid") return fail("Invoice already paid", 409);

  // Zelle and CashApp orders are settled by hand and have no business on the
  // card payment page, whatever id someone pastes in.
  if (order.paymentMethod !== "card") return fail("Invoice not payable by card", 409);

  return NextResponse.json(
    {
      order_id: order.id,
      order_number: order.orderNumber,
      // The two fields payment.js actually reads. `customer` must be truthy or
      // it skips the summary and the auto-submit; `total` is what it charges.
      customer: order.shippingName ?? "",
      total: (order.totalCents / 100).toFixed(2),
      currency: "USD",
      status: order.status,
    },
    {
      headers: {
        // The plugin fetches this cross-origin from upgradebiolabservices.com.
        "Access-Control-Allow-Origin": "*",
        // A total a payment page is about to charge is never served stale.
        "Cache-Control": "no-store",
      },
    }
  );
}
