/**
 * The order lifecycle, as one list.
 *
 * WooCommerce gave the client a status dropdown on every order, and losing it
 * would mean losing the only record of what has actually been packed and sent.
 * This is that dropdown's vocabulary.
 *
 * Defined once and imported by the database constraint (via migration 0004),
 * the admin API and the dashboard, because three copies of a status list is
 * three chances for the UI to offer a value the database rejects.
 *
 * Order matters: the array is the sequence a normal order moves through, and
 * the dashboard renders it in this order.
 */

export const ORDER_STATUSES = [
  {
    id: "pending_payment",
    label: "Pending payment",
    /** What the client should understand this to mean, in their words. */
    hint: "Card order sent to the payment page. Not paid yet.",
    tone: "wait",
  },
  {
    id: "awaiting_payment",
    label: "Awaiting transfer",
    hint: "Zelle or CashApp. Waiting for the money to land.",
    tone: "wait",
  },
  {
    id: "paid",
    label: "Paid — to pack",
    hint: "Payment confirmed. This one needs packing.",
    tone: "go",
  },
  {
    id: "shipped",
    label: "Shipped",
    hint: "Out the door. Add the tracking number here.",
    tone: "go",
  },
  {
    id: "completed",
    label: "Completed",
    hint: "Delivered and closed.",
    tone: "done",
  },
  {
    id: "cancelled",
    label: "Cancelled",
    hint: "Order will not be fulfilled.",
    tone: "stop",
  },
  {
    id: "refunded",
    label: "Refunded",
    hint: "Money returned to the customer.",
    tone: "stop",
  },
] as const;

export type OrderStatusId = (typeof ORDER_STATUSES)[number]["id"];

export const STATUS_IDS = ORDER_STATUSES.map((s) => s.id) as readonly string[];

export const isOrderStatus = (v: unknown): v is OrderStatusId =>
  typeof v === "string" && STATUS_IDS.includes(v);

export const statusLabel = (id: string) =>
  ORDER_STATUSES.find((s) => s.id === id)?.label ?? id;

export const statusTone = (id: string) =>
  ORDER_STATUSES.find((s) => s.id === id)?.tone ?? "wait";

/**
 * Statuses that mean the goods have left. Setting one stamps `shipped_at`, so
 * "when did this actually go out" is answerable without reading an audit log.
 */
export const SHIPPED_STATUSES: readonly string[] = ["shipped", "completed"];
