import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { syncPriceCache } from "@/lib/price-cache";

// Same reasoning as the admin route - a full catalog sync against a slow
// WooCommerce server needs real headroom, not the old 10s serverless
// default.
export const maxDuration = 300;

/**
 * Automatic daily backstop for the price/stock sync. Vercel's Hobby plan
 * only allows once-a-day Cron schedules (see vercel.json) - the "Update
 * Prices" button in /admin is the primary way to get an immediate refresh;
 * this exists so Supabase's price_cache never goes more than a day stale
 * even if nobody presses it.
 *
 * Authenticated the way Vercel Cron actually authenticates itself: a Bearer
 * token matching CRON_SECRET, which Vercel provisions automatically as an
 * environment variable - not the admin session cookie isAdmin() checks,
 * since a cron invocation has no browser session to carry one.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  try {
    const result = await syncPriceCache();
    revalidatePath("/product/[slug]", "page");
    revalidatePath("/shop", "page");
    return NextResponse.json({ ...result, revalidated: true, at: new Date().toISOString() });
  } catch (e) {
    console.error("[cron] price sync failed", e);
    return NextResponse.json({ error: "Sync failed - check server logs." }, { status: 500 });
  }
}
