import "server-only";
import { createHash } from "node:crypto";
import { LEGACY_CUSTOMER_HASHES } from "./legacy-customers";
import { getSupabaseAdmin } from "./supabase";

/**
 * Eligibility for the first-order promotion.
 *
 * `import "server-only"` is load-bearing: the blocklist is the client's real
 * customer list, and a stray import into a client component would ship all 964
 * hashes to every visitor.
 *
 * Two ways to fail:
 *   1. The address is on the legacy store's customer list.
 *   2. The address has already used a first-order code here.
 *
 * The check runs at checkout, not when the code is typed, because that is the
 * first moment we know who the customer is.
 */

/** Providers that ignore dots in the local part. */
const DOT_INSENSITIVE = new Set(["gmail.com", "googlemail.com"]);

/**
 * Collapses the variants that are one inbox to one identity.
 *
 * Must stay identical to the normaliser in
 * scripts/build-legacy-blocklist.mjs, or the hashes will not line up and the
 * blocklist silently matches nothing.
 */
export function normalizeEmail(raw: string | null | undefined): string {
  const email = String(raw ?? "").trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 1) return "";
  let local = email.slice(0, at);
  const domain = email.slice(at + 1);

  const plus = local.indexOf("+");
  if (plus > 0) local = local.slice(0, plus);
  if (DOT_INSENSITIVE.has(domain)) local = local.replaceAll(".", "");

  return local && domain ? `${local}@${domain}` : "";
}

const hash = (s: string) =>
  createHash("sha256").update(s).digest("hex").slice(0, 32);

export const isLegacyCustomer = (email: string) => {
  const n = normalizeEmail(email);
  return !!n && LEGACY_CUSTOMER_HASHES.has(hash(n));
};

/**
 * Marks a browser that has already claimed a first-order code.
 *
 * This is the front-line check and the reason it exists: it is the only signal
 * available *before* the customer types an email, so the code can be refused
 * the moment it is entered rather than snatched away at the payment step.
 *
 * It is not a strong control on its own - incognito or another browser clears
 * it - which is why the email checks below still run at checkout. Not signed:
 * the only thing forging this cookie achieves is blocking yourself.
 */
export const FIRST_ORDER_COOKIE = "ubl_fo";
/** Two years. Long enough that "first order" means what it says. */
export const FIRST_ORDER_COOKIE_MAX_AGE = 60 * 60 * 24 * 730;

export type Eligibility = {
  eligible: boolean;
  /** Machine-readable so the caller can choose the message. */
  reason: "ok" | "used-on-device" | "legacy-customer" | "already-used";
};

/**
 * Whether this address may use a first-order code.
 *
 * Fails OPEN on a database error. A transient Supabase outage should not stop
 * a legitimate first-time buyer from checking out; the legacy blocklist is
 * local and still applies either way.
 */
export async function checkFirstOrderEligibility(
  email: string,
  deviceUsed = false
): Promise<Eligibility> {
  // Cheapest check first, and the only one that works with no email at all.
  if (deviceUsed) return { eligible: false, reason: "used-on-device" };

  if (isLegacyCustomer(email)) {
    return { eligible: false, reason: "legacy-customer" };
  }

  const db = getSupabaseAdmin();
  if (!db) return { eligible: true, reason: "ok" };

  const normalized = normalizeEmail(email);
  const { data, error } = await db
    .from("promo_redemptions")
    .select("id")
    .eq("normalized_email", normalized)
    .limit(1);

  if (error) return { eligible: true, reason: "ok" };
  return data?.length
    ? { eligible: false, reason: "already-used" }
    : { eligible: true, reason: "ok" };
}

/** Records a redemption so the code cannot be reused by the same inbox. */
export async function recordRedemption(email: string, code: string, orderRef: string) {
  const db = getSupabaseAdmin();
  if (!db) return;
  const normalized = normalizeEmail(email);
  if (!normalized) return;

  // Conflict on the unique index is the expected outcome of a double submit,
  // not an error worth surfacing.
  await db
    .from("promo_redemptions")
    .upsert(
      { normalized_email: normalized, code, order_ref: orderRef },
      { onConflict: "normalized_email" }
    );
}

/**
 * Customer-facing reasons.
 *
 * Each one says plainly that the code is spent and reassures that the bundle
 * savings are not - otherwise a rejected code reads as "the site lost my
 * discount" and turns into a support email.
 */
export const FIRST_ORDER_MESSAGE: Record<Eligibility["reason"], string> = {
  ok: "",
  "used-on-device":
    "Discount code already used. Your quantity and bundle savings still apply.",
  "legacy-customer":
    "This code is for first-time customers only, and this email has ordered with us before. Your quantity and bundle savings still apply.",
  "already-used":
    "Discount code already used on this email. Your quantity and bundle savings still apply.",
};
