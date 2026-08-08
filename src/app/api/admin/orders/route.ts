import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isOrderStatus, SHIPPED_STATUSES } from "@/lib/order-status";

/**
 * Updates the fulfilment state of one order. Admin session required.
 *
 * This is the WooCommerce status dropdown: mark an order paid, shipped,
 * cancelled, and attach a tracking number. It is the only route in the app
 * that writes to an existing order - the checkout creates them and never
 * touches them again - so it is deliberately narrow. It can set a status, a
 * tracking number and a carrier, and nothing else. No money field is
 * reachable from here, so a mis-click cannot alter what a customer was
 * charged.
 */

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json(
      { error: "Supabase is not configured on this deployment." },
      { status: 503 }
    );
  }

  let body: { id?: string; status?: string; tracking?: string; carrier?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const id = String(body.id ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Unknown order." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};

  if (body.status !== undefined) {
    // Checked against the shared list rather than passed through, so the
    // database's CHECK constraint is never the thing that discovers a typo.
    if (!isOrderStatus(body.status)) {
      return NextResponse.json({ error: "Unknown status." }, { status: 422 });
    }
    patch.status = body.status;
    // Stamped here rather than left to whoever remembers, so "when did this
    // ship" has an answer. Clearing the status back off shipped clears it too,
    // otherwise a mistaken click leaves a permanent false dispatch date.
    patch.shipped_at = SHIPPED_STATUSES.includes(body.status)
      ? new Date().toISOString()
      : null;
  }

  if (body.tracking !== undefined) {
    patch.tracking_number = String(body.tracking).trim() || null;
  }
  if (body.carrier !== undefined) {
    patch.tracking_carrier = String(body.carrier).trim() || null;
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  let { data, error } = await db
    .from("orders")
    .update(patch)
    .eq("id", id)
    .select("id,status,tracking_number,tracking_carrier,shipped_at")
    .maybeSingle();

  // Before migration 0004 the tracking columns do not exist. Rather than
  // failing the whole update, retry with just the status - being able to mark
  // an order shipped matters more than recording the number alongside it.
  const missingColumn =
    error && (error.code === "42703" || error.code === "PGRST204");

  if (missingColumn && patch.status) {
    ({ data, error } = await db
      .from("orders")
      .update({ status: patch.status })
      .eq("id", id)
      .select("id,status")
      .maybeSingle());

    if (!error && data) {
      return NextResponse.json({
        ok: true,
        order: data,
        // Surfaced so the dashboard can say why the tracking number vanished
        // rather than appearing to silently drop it.
        warning: "Tracking not saved: run migration 0004 to add those columns.",
      });
    }
  }

  if (error) {
    console.error("[admin/orders] update:", error.message);
    return NextResponse.json({ error: "Could not update that order." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Unknown order." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, order: data });
}
