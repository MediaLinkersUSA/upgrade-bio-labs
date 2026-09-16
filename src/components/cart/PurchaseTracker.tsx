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
 * Only fires once `order.status === "paid"`. Firing on arrival regardless of
 * payment status would report Zelle/CashApp reservations - which the
 * customer may never actually pay - as completed sales. The tradeoff: a card
 * order whose payment webhook hasn't landed yet by the time this page first
 * renders won't fire here either. That's judged the safer failure mode for
 * ad-spend optimization (a slightly late/missed purchase ping over a
 * fabricated one), not a guarantee every paid order is caught the instant it
 * pays - a server-side conversion event, if one exists downstream, is what
 * would close that gap.
 */
export default function PurchaseTracker({ order }: { order: StoredOrder }) {
  useEffect(() => {
    if (order.status !== "paid") return;

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
  }, [order.id, order.status]);

  return null;
}
