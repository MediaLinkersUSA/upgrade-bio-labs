import { NextResponse } from "next/server";
import { getProduct } from "@/data/products";
import { getLivePricingForSlugs } from "@/lib/live-pricing";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Live WooCommerce prices for a batch of products.
 *
 * The storefront's product/shop pages stay statically generated (fast,
 * served from the CDN, unaffected by a WordPress outage) and call this after
 * they have already rendered with the static catalog's prices, then swap in
 * whatever comes back. So a page never blocks on WordPress to become
 * visible, but every visitor still sees a freshly-fetched price a moment
 * later - see lib/live-pricing.ts for how the numbers are derived.
 *
 * Never cached: the whole point is that a price changed in WP Admin shows up
 * on the next fetch, not on the next deploy.
 */
export const dynamic = "force-dynamic";

const MAX_SLUGS = 60; // the entire catalog - one honest ceiling, not a guess

export async function POST(req: Request) {
  // Public, unauthenticated, and fans out to WordPress per slug - throttled
  // so it cannot be used to hammer the client's WooCommerce site.
  const gate = rateLimit(`live-price:${clientIp(req)}`, 30, 60 * 1000);
  if (!gate.ok) {
    return NextResponse.json(
      { prices: {} },
      { status: 429, headers: { "Retry-After": String(gate.retryAfter) } }
    );
  }

  let slugs: string[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body.slugs)) {
      slugs = body.slugs.filter((s: unknown) => typeof s === "string").slice(0, MAX_SLUGS);
    }
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // Only real, known slugs reach WooCommerce - garbage in the request body
  // just gets dropped rather than turned into a wasted Woo API call.
  const products = [...new Set(slugs)]
    .map((s) => getProduct(s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const prices = await getLivePricingForSlugs(products);
  return NextResponse.json({ prices });
}
