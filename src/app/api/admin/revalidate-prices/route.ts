import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";

/**
 * Forces every product page and the shop grid to re-render from WooCommerce
 * on the very next request, without waiting for the 2-hour background
 * schedule (see the `revalidate` export on those pages).
 *
 * This is the "Update Prices" button in /admin. It does not fetch or
 * change anything itself - it only clears Next.js's cached HTML for these
 * routes, so the next visitor's request rebuilds them with a fresh
 * WooCommerce lookup. If nobody visits a given product in the meantime,
 * nothing is wasted; the rebuild happens lazily, on that next request.
 */
export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  // The dynamic-route pattern form (not a specific slug) invalidates every
  // generated /product/<slug> page in one call - there is no need to loop
  // over the catalog.
  revalidatePath("/product/[slug]", "page");
  revalidatePath("/shop", "page");

  return NextResponse.json({ revalidated: true, at: new Date().toISOString() });
}
