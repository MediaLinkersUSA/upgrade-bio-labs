declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/** GA4-shaped line item, per the Stape setup spec. */
export type Ga4Item = {
  item_id: string;
  item_name: string;
  price: number;
  quantity?: number;
  item_brand?: string;
  item_category?: string;
};

/**
 * A short, unique id per event push - required by the Stape/Meta setup for
 * browser/server deduplication (see SST_Setup_Instructions.pdf). Time plus a
 * few random characters is enough entropy for this; it only has to be unique
 * within one customer's session, not globally.
 */
function eventId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Pushes one ecommerce event to window.dataLayer, `_stape`-suffixed and
 * carrying its own event_id, per the agency's setup spec. A no-op on the
 * server and before GTM has initialised dataLayer - never throws, since a
 * tracking failure must never be the reason a purchase or an add-to-cart
 * click appears to fail to the customer.
 */
export function trackEcommerce(event: string, payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({
      event: `${event}_stape`,
      event_id: eventId(event),
      ...payload,
    });
  } catch (e) {
    console.error("[analytics] dataLayer push failed", e);
  }
}
