import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { syncPriceCache } from "@/lib/price-cache";

// Vercel's current default (300s on every plan, Hobby included) already
// covers this, but set explicitly so a future plan/default change can't
// silently shrink it out from under a real 65-product sync.
export const maxDuration = 300;

/**
 * The "Update Prices" button in /admin. Pulls fresh price/stock for the
 * whole catalog from WooCommerce and writes it to Supabase's price_cache -
 * customer-facing pages read from there, never from WooCommerce directly,
 * so this is now the ONLY place a slow WooCommerce response can be felt,
 * and it's an admin action, not a customer's page load.
 *
 * revalidatePath afterward clears the cached HTML too, so the very next
 * page view reflects the just-synced numbers instead of waiting for the
 * page's own revalidate window.
 */
export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  try {
    const result = await syncPriceCache();
    revalidatePath("/product/[slug]", "page");
    revalidatePath("/shop", "page");
    return NextResponse.json({ ...result, revalidated: true, at: new Date().toISOString() });
  } catch (e) {
    console.error("[admin] price sync failed", e);
    return NextResponse.json({ error: "Sync failed - check server logs." }, { status: 500 });
  }
}
