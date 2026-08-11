import "server-only";
import { getSupabaseAdmin } from "./supabase";

/**
 * Affiliate attribution.
 *
 * Mirrors the shape of first-order.ts: a cookie set on arrival is the
 * front-line signal, and the real lookup happens server-side at the moment
 * that matters - here, when an order is created rather than when a promo
 * code is typed.
 *
 * Last-click: middleware overwrites the cookie every time a fresh ?ref=
 * shows up, so the affiliate credited is whoever sent the visit that led
 * most directly to the order, not whoever sent the very first one.
 */

/** Set by middleware.ts on any request carrying ?ref=. */
export const REF_COOKIE = "ubl_ref";
/** 30 days. Long enough to cover a considered purchase, short enough that an
 *  old campaign link does not keep crediting an affiliate forever. */
export const REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export type Affiliate = {
  id: string;
  code: string;
  name: string;
  commissionBps: number;
};

const normalizeCode = (raw: string | null | undefined): string =>
  String(raw ?? "").trim().toLowerCase();

/** Validated once, in middleware, before it ever reaches a cookie or a query. */
export const isPlausibleRefCode = (raw: string): boolean =>
  /^[a-z0-9_-]{2,32}$/i.test(raw);

/**
 * Looks up an active affiliate by code. Case-insensitive.
 *
 * Returns null on a database error rather than throwing - an affiliate
 * lookup failing must never be the reason an order does not save, so this
 * fails the same way a missing cookie would: no credit, not a broken
 * checkout.
 */
export async function findAffiliate(code: string | null | undefined): Promise<Affiliate | null> {
  const normalized = normalizeCode(code);
  if (!normalized) return null;

  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data, error } = await db
    .from("affiliates")
    .select("id, code, name, commission_bps")
    .eq("active", true)
    .ilike("code", normalized)
    .maybeSingle();

  if (error || !data) return null;
  return { id: data.id, code: data.code, name: data.name, commissionBps: data.commission_bps };
}

/**
 * What the affiliate earns on this order.
 *
 * Computed on (total - shipping): shipping is a pass-through cost, not
 * revenue, and commissioning it would pay affiliates more for a customer who
 * chose expedited shipping than one who bought more product.
 */
export function computeCommissionCents(totalCents: number, shippingCents: number, bps: number): number {
  const base = Math.max(0, totalCents - shippingCents);
  return Math.round((base * bps) / 10_000);
}
