import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolvePromoCode } from "@/lib/promo-resolve";
import { FIRST_ORDER_COOKIE, FIRST_ORDER_MESSAGE } from "@/lib/first-order";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Validates a promotion code at the moment it is typed.
 *
 * Checks the built-in first-order code first, then falls through to a live
 * WooCommerce coupon lookup (see lib/promo-resolve.ts) so the client can
 * manage discount codes from WP Admin without a deploy.
 *
 * Only the device check runs here, because it is the only one that works with
 * no email: the customer has not given us one yet. The email check happens at
 * checkout, where they can. Doing the device check this early is the whole
 * point of the cookie - it means a repeat visitor is told the code is spent
 * while they are still shopping, instead of watching 25% disappear on the
 * payment screen.
 */
export async function POST(req: Request) {
  const gate = rateLimit(`promo:${clientIp(req)}`, 30, 10 * 60 * 1000);
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, reason: "rate-limited", message: "Too many attempts. Try again shortly." },
      { status: 429 }
    );
  }

  let code = "";
  let subtotalCents = 0;
  try {
    const body = await req.json();
    code = String(body.code ?? "");
    subtotalCents = Math.max(0, Math.floor(Number(body.subtotalCents) || 0));
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  const result = await resolvePromoCode(code, { subtotalCents });
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason, message: result.message });
  }
  const { promo } = result;

  if (promo.firstOrderOnly) {
    const jar = await cookies();
    if (jar.get(FIRST_ORDER_COOKIE)?.value) {
      return NextResponse.json({
        ok: false,
        reason: "used-on-device",
        message: FIRST_ORDER_MESSAGE["used-on-device"],
      });
    }
  }

  return NextResponse.json({
    ok: true,
    code: promo.code,
    rate: promo.rate,
    label: promo.label,
    source: promo.source,
  });
}
