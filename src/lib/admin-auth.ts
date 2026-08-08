import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Single-operator admin session.
 *
 * The dashboard exposes customer emails and order history, so it is never
 * reachable without a session. Deliberate design choices:
 *
 *  - Fails CLOSED. With no ADMIN_PASSWORD set, login always rejects and the
 *    dashboard is unreachable. An unconfigured deploy is a locked deploy, not
 *    an open one.
 *  - The cookie is an HMAC of the expiry signed with the password, so a
 *    forged cookie cannot be minted without knowing it. httpOnly + secure +
 *    sameSite=lax, so it is not readable from JavaScript.
 *  - Password comparison is constant-time, so response timing does not leak
 *    how much of a guess was correct.
 */
const COOKIE = "ubl_admin";
const MAX_AGE = 60 * 60 * 8; // 8 hours

const secret = () => process.env.ADMIN_PASSWORD ?? "";

export const isAdminConfigured = () => secret().length >= 8;

function sign(expires: number) {
  return createHmac("sha256", secret()).update(String(expires)).digest("hex");
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Still burn a comparison so length alone is not a timing signal.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

/** Verifies a submitted password and returns the cookie value to set. */
export function createSession(password: string): string | null {
  if (!isAdminConfigured()) return null;
  if (!safeEqual(password, secret())) return null;
  const expires = Date.now() + MAX_AGE * 1000;
  return `${expires}.${sign(expires)}`;
}

export function verifyToken(token: string | undefined): boolean {
  if (!isAdminConfigured() || !token) return false;
  const [expiresRaw, mac] = token.split(".");
  const expires = Number(expiresRaw);
  if (!expires || Number.isNaN(expires) || Date.now() > expires) return false;
  if (!mac) return false;
  return safeEqual(mac, sign(expires));
}

/** Server-component / route-handler guard. */
export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verifyToken(jar.get(COOKIE)?.value);
}

export const ADMIN_COOKIE = COOKIE;
export const ADMIN_MAX_AGE = MAX_AGE;
export const newNonce = () => randomBytes(16).toString("hex");
