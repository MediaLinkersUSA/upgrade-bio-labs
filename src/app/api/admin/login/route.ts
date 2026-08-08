import { NextResponse } from "next/server";
import {
  createSession,
  isAdminConfigured,
  ADMIN_COOKIE,
  ADMIN_MAX_AGE,
} from "@/lib/admin-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/** Ten attempts per IP per fifteen minutes. */
const LIMIT = 10;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Admin access is not configured on this deployment." },
      { status: 503 }
    );
  }

  // Throttle before doing any work. Without this the endpoint accepts guesses
  // as fast as they arrive, which is the difference between a memorable
  // password being inconvenient to crack and being trivial to crack.
  const gate = rateLimit(`admin-login:${clientIp(req)}`, LIMIT, WINDOW_MS);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfter) } }
    );
  }

  let password = "";
  try {
    const body = await req.json();
    password = String(body.password ?? "");
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const token = createSession(password);
  if (!token) {
    // Deliberately vague: never confirm whether a password merely "exists".
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
