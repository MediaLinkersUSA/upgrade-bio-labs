/**
 * Fixed-window rate limiter for auth endpoints.
 *
 * The admin password gates every customer email and order on the site, and the
 * login route otherwise accepts guesses as fast as they arrive. A brand-shaped
 * password is well within reach of an unthrottled dictionary attack, so the
 * endpoint needs a cost per attempt regardless of what the password is.
 *
 * Caveat worth stating plainly: this is in-process. On serverless each
 * instance keeps its own counter, so a determined attacker who can force cold
 * starts gets more attempts than the nominal limit. It raises the cost of a
 * casual attack by orders of magnitude, it does not make a weak password safe.
 * A strong password is still the actual control.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Bounded so a flood of unique keys cannot grow the map without limit. */
const MAX_KEYS = 5_000;

export type RateLimitResult = {
  ok: boolean;
  /** Seconds until the window resets. Only meaningful when `ok` is false. */
  retryAfter: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now > existing.resetAt) {
    if (buckets.size >= MAX_KEYS) {
      for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
      if (buckets.size >= MAX_KEYS) buckets.clear();
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return { ok: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

/** Best-effort client address. Vercel sets x-forwarded-for. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
