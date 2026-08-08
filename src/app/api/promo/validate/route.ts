import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findPromo } from "@/lib/promo";
import { FIRST_ORDER_COOKIE, FIRST_ORDER_MESSAGE } from "@/lib/first-order";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Validates a promotion code at the moment it is typed.
 *
 * Only the device check runs here, because it is the only one that works with
 * no email: the customer has not given us one yet. The email checks happen at
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
  try {
    const body = await req.json();
    code = String(body.code ?? "");
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  const promo = findPromo(code);
  if (!promo) {
    return NextResponse.json({
      ok: false,
      reason: "unknown",
      message: "That discount code is not recognized. Check the spelling and try again.",
    });
  }

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

  return NextResponse.json({ ok: true, code: promo.code, rate: promo.rate });
}
