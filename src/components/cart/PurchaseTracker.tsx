"use client";

import { useEffect } from "react";
import { trackEcommerce } from "@/lib/analytics";
import type { StoredOrder } from "@/lib/order-store";

/**
 * Renders nothing - fires purchase once per order, ever, not once per page
 * view. A customer reloading (or revisiting via a bookmarked link) must not
 * re-report the same sale, so a sessionStorage flag keyed by order id guards
 * it - cheap, and correct for the overwhelmingly common case of a customer
 * looking at their own confirmation page more than once.
 *
 * Fires on arrival at either order-confirmation page (thank-you for
 * card/instant payments, order/pending for Zelle/CashApp), regardless of
 * exact payment status - per the agency's spec, the trigger is "Successful
 * completed order / thank-you page", not a later payment-webhook
 * confirmation. This was originally gated on `order.status === "paid"`,
 * which was too strict: the payment site's webhook and the browser's
 * redirect back to this page are two independent things with no guaranteed
 * ordering, so status was frequently still "pending" at the exact moment
 * this page first rendered even for card orders - and Zelle/CashApp orders
 * are *never* "paid" at this point by design, so the old gate meant this
 * event effectively never fired for either payment path. Confirmed by the
 * agency's own test order and their workaround of triggering off the page
 * URL instead.
 *
 * Tradeoff, stated plainly: a Zelle/CashApp order the customer never
 * actually pays still reports as a "purchase" to Meta/Google. Standard
 * practice industry-wide (most stores fire purchase at order-placed, not at
 * a later async payment confirmation), and what the agency's spec and their
 * own workaround both already assume.
 */
export default function PurchaseTracker({ order }: { order: StoredOrder }) {
  useEffect(() => {
    const flag = `ubl_purchase_tracked_${order.id}`;
    try {
      if (sessionStorage.getItem(flag)) return;
      sessionStorage.setItem(flag, "1");
    } catch {
      // Storage unavailable (private mode/quota) - proceed anyway rather
      // than silently drop the one purchase ping that actually matters;
      // worst case here is a rare duplicate, not a rare loss.
    }

    const addr = order.shippingAddress ?? {};
    const [firstName, ...rest] = (order.shippingName ?? "").split(" ");

    trackEcommerce("purchase", {
      // Overrides trackEcommerce's default random id - deliberately
      // deterministic per the PDF spec, so a matching server-side
      // conversion event (if one exists) dedupes against this one.
      event_id: `${order.orderNumber}_purchase`,
      ecommerce: {
        transaction_id: order.orderNumber,
        currency: "USD",
        value: order.totalCents / 100,
        tax: 0,
        shipping: order.shippingCents / 100,
        items: order.items.map((i) => ({
          item_id: i.slug ?? i.name,
          item_name: i.name,
          price: i.unitCents / 100,
          quantity: i.quantity,
        })),
      },
      user_data: {
        email: order.email,
        phone: order.phone,
        address: {
          first_name: firstName || null,
          last_name: rest.join(" ") || null,
          city: addr.city ?? null,
          state: addr.state ?? null,
          postal_code: addr.postal_code ?? null,
          country: addr.country ?? "US",
        },
      },
    });
    // Runs once per mount by design - order.id is this page's whole identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  return null;
}
