import "server-only";
import { getSupabaseAdmin } from "./supabase";

/**
 * Reads and writes orders, on whichever schema the database currently has.
 *
 * Every order in this store is created BEFORE any money moves - card orders
 * hand off to the external payment site and are identified there by nothing
 * but the row id, and Zelle/CashApp orders are settled by hand afterwards.
 * So the write path can never depend on a payment processor having spoken
 * first.
 *
 * Migration 0004 adds order_number, payment_method, phone, order_notes,
 * payment_reference, paid_at and order_items.size, and drops the NOT NULL on
 * stripe_session_id. Until it is run none of that exists, so every insert is
 * attempted in the rich shape first and retried in the legacy shape on a
 * missing-column error. Nothing is lost: the legacy schema's shipping_address
 * is already free-form jsonb, and the order reference goes in
 * stripe_session_id, which is NOT NULL UNIQUE and wants exactly that.
 *
 * The moment the migration runs, the first attempt starts succeeding and the
 * fallback stops being used. No redeploy, no flag to flip.
 */

/** Postgres/PostgREST codes for "that column or table is not there". */
const MISSING_SCHEMA = new Set(["42703", "42P01", "PGRST204", "PGRST205"]);

const isMissingSchema = (e: { code?: string; message?: string } | null) =>
  !!e && (MISSING_SCHEMA.has(e.code ?? "") || /column .* does not exist/i.test(e.message ?? ""));

export type OrderInput = {
  orderNumber: string;
  paymentMethod: string;
  /** pending_payment for card, awaiting_payment for a transfer. */
  status: string;
  email: string;
  phone: string | null;
  notes: string | null;
  shippingName: string;
  shippingAddress: Record<string, string>;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  distinctCompounds: number;
  discountRate: number;
  /** Affiliate attribution, from the ubl_ref cookie. Null on an unreferred order. */
  refCode: string | null;
  affiliateId: string | null;
  commissionCents: number;
  items: {
    slug: string;
    name: string;
    format: string;
    size?: string;
    quantity: number;
    unitCents: number;
    lineCents: number;
  }[];
};

export type OrderResult =
  | { ok: true; id: string; legacy: boolean }
  | { ok: false; error: string };

export async function createOrder(input: OrderInput): Promise<OrderResult> {
  const db = getSupabaseAdmin();
  if (!db) return { ok: false, error: "no-database" };

  const money = {
    subtotal_cents: input.subtotalCents,
    discount_cents: input.discountCents,
    shipping_cents: input.shippingCents,
    total_cents: input.totalCents,
    distinct_compounds: input.distinctCompounds,
    stack_discount_rate: input.discountRate,
  };

  // --- preferred shape, post-migration ----------------------------------
  const rich = {
    order_number: input.orderNumber,
    payment_method: input.paymentMethod,
    status: input.status,
    email: input.email,
    phone: input.phone,
    order_notes: input.notes,
    shipping_name: input.shippingName,
    shipping_address: input.shippingAddress,
    ref_code: input.refCode,
    affiliate_id: input.affiliateId,
    commission_cents: input.commissionCents,
    ...money,
  };

  let { data, error } = await db.from("orders").insert(rich).select("id").single();
  let legacy = false;

  // Affiliate columns (0005) can be missing independently of the rest of the
  // rich shape (0004) - a store that has run 0004 but not 0005 should still
  // get the order saved, just without attribution, rather than falling all
  // the way back to the pre-0004 legacy shape. Retried without those three
  // keys specifically before assuming the whole rich shape is unavailable.
  if (isMissingSchema(error)) {
    const { ref_code, affiliate_id, commission_cents, ...richWithoutAffiliate } = rich;
    void ref_code; void affiliate_id; void commission_cents;
    const retry = await db.from("orders").insert(richWithoutAffiliate).select("id").single();
    if (!isMissingSchema(retry.error)) {
      ({ data, error } = retry);
    }
  }

  if (isMissingSchema(error)) {
    legacy = true;
    // --- legacy shape ---------------------------------------------------
    // Everything the old schema has no column for rides along inside
    // shipping_address, which is already jsonb and already free-form.
    const fallback = {
      stripe_session_id: input.orderNumber,
      status: input.status,
      email: input.email,
      shipping_name: input.shippingName,
      shipping_address: {
        ...input.shippingAddress,
        order_number: input.orderNumber,
        payment_method: input.paymentMethod,
        phone: input.phone ?? "",
        order_notes: input.notes ?? "",
        ref_code: input.refCode ?? "",
        affiliate_id: input.affiliateId ?? "",
        commission_cents: input.commissionCents,
      },
      ...money,
    };
    ({ data, error } = await db.from("orders").insert(fallback).select("id").single());
  }

  if (error || !data) {
    console.error("order insert failed", error);
    return { ok: false, error: error?.message ?? "insert-failed" };
  }

  // --- line items --------------------------------------------------------
  const richItems = input.items.map((i) => ({
    order_id: data!.id,
    product_slug: i.slug,
    product_name: i.name,
    format: i.format,
    size: i.size ?? null,
    quantity: i.quantity,
    unit_cents: i.unitCents,
    line_cents: i.lineCents,
  }));

  let itemsError = (await db.from("order_items").insert(richItems)).error;

  if (isMissingSchema(itemsError)) {
    // No size column: fold the fill into the product name so the packing slip
    // still says which one was bought.
    const legacyItems = input.items.map((i) => ({
      order_id: data!.id,
      product_slug: i.slug,
      product_name: i.size ? `${i.name} (${i.size})` : i.name,
      format: i.format,
      quantity: i.quantity,
      unit_cents: i.unitCents,
      line_cents: i.lineCents,
    }));
    itemsError = (await db.from("order_items").insert(legacyItems)).error;
  }

  if (itemsError) console.error("order_items insert failed", itemsError);

  return { ok: true, id: data.id, legacy };
}

/**
 * Records the WooCommerce order id against our row.
 *
 * This is the join between the two systems: it is what lets a status change
 * here reach the right order there, and what stops a reconciliation job
 * mirroring the same order twice.
 *
 * Stored in the shipping_address blob when the dedicated column is missing,
 * same as everything else that predates the migration.
 */
export async function recordWooId(id: string, wooId: number): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) return;

  const { error } = await db.from("orders").update({ woo_order_id: wooId }).eq("id", id);
  if (!isMissingSchema(error)) {
    if (error) console.error("[woo] could not record id", error.message);
    return;
  }

  const { data } = await db
    .from("orders")
    .select("shipping_address")
    .eq("id", id)
    .maybeSingle();

  await db
    .from("orders")
    .update({
      shipping_address: { ...(data?.shipping_address ?? {}), woo_order_id: wooId },
    })
    .eq("id", id);
}

// -------------------------------------------------------------------- read

export type StoredOrder = {
  id: string;
  orderNumber: string;
  paymentMethod: string;
  status: string;
  email: string | null;
  shippingName: string | null;
  shippingAddress: Record<string, string> | null;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  wooOrderId: number | null;
  refCode: string | null;
  affiliateId: string | null;
  commissionCents: number;
  createdAt: string;
  items: { name: string; size: string | null; quantity: number; lineCents: number }[];
};

/**
 * Loads one order by its database id, for the confirmation page.
 *
 * The id is the capability: a v4 uuid is not guessable, so knowing one is
 * treated as authorisation to see that order and nothing else. It is looked up
 * by primary key only - never by email or order number - so a customer cannot
 * walk the table by guessing short references.
 *
 * Selects `*` because which columns exist depends on whether 0004 has run.
 */
export async function getOrder(id: string): Promise<StoredOrder | null> {
  // A malformed uuid makes Postgres raise rather than return no rows, so it is
  // rejected before it reaches the query.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }

  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data, error } = await db
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const addr = (data.shipping_address ?? null) as Record<string, string> | null;

  return {
    id: data.id,
    // Post-migration it is its own column; pre-migration it was packed into
    // the address blob, with stripe_session_id as the last resort.
    orderNumber: data.order_number ?? addr?.order_number ?? data.stripe_session_id ?? "",
    paymentMethod: data.payment_method ?? addr?.payment_method ?? "card",
    status: data.status ?? "pending_payment",
    email: data.email ?? null,
    shippingName: data.shipping_name ?? null,
    shippingAddress: addr,
    subtotalCents: data.subtotal_cents ?? 0,
    discountCents: data.discount_cents ?? 0,
    shippingCents: data.shipping_cents ?? 0,
    totalCents: data.total_cents ?? 0,
    wooOrderId: data.woo_order_id ?? addr?.woo_order_id ?? null,
    refCode: data.ref_code ?? (addr?.ref_code || null),
    affiliateId: data.affiliate_id ?? (addr?.affiliate_id || null),
    commissionCents: data.commission_cents ?? Number(addr?.commission_cents ?? 0),
    createdAt: data.created_at,
    items: (data.order_items ?? []).map(
      (i: Record<string, unknown>) => ({
        name: String(i.product_name ?? ""),
        size: (i.size as string | null) ?? null,
        quantity: Number(i.quantity ?? 0),
        lineCents: Number(i.line_cents ?? 0),
      })
    ),
  };
}
