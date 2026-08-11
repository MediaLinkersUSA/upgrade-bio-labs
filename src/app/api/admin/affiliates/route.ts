import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * Affiliate roster and performance, for the admin dashboard.
 *
 * GET returns every affiliate plus, per affiliate, the order count and total
 * commission owed - computed from the orders table rather than kept as a
 * running counter, so it can never drift out of sync with what was actually
 * recorded at each order's creation.
 *
 * POST creates a new affiliate. That is the whole write surface: rates are
 * edited the same way (PATCH), but nothing here ever touches an existing
 * order's stored commission_cents - see the comment on that column.
 */

export const dynamic = "force-dynamic";

export async function GET() {
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

  const { data: affiliates, error } = await db
    .from("affiliates")
    .select("id, code, name, email, commission_bps, active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/affiliates] list:", error.message);
    return NextResponse.json({ error: "Could not load affiliates." }, { status: 500 });
  }

  // One query for every affiliate's orders rather than N+1 - the dashboard
  // has a handful of affiliates, not thousands, so this stays a single
  // round trip either way.
  const { data: orders, error: ordersError } = await db
    .from("orders")
    .select("affiliate_id, commission_cents, status")
    .not("affiliate_id", "is", null);

  if (ordersError) console.error("[admin/affiliates] orders:", ordersError.message);

  const stats = new Map<string, { orders: number; commissionCents: number }>();
  for (const o of orders ?? []) {
    // Cancelled and refunded orders earn nothing - crediting a sale that was
    // unwound would pay a commission on money the client never kept.
    if (["cancelled", "refunded"].includes(o.status)) continue;
    const key = o.affiliate_id as string;
    const s = stats.get(key) ?? { orders: 0, commissionCents: 0 };
    s.orders += 1;
    s.commissionCents += Number(o.commission_cents ?? 0);
    stats.set(key, s);
  }

  return NextResponse.json({
    affiliates: (affiliates ?? []).map((a) => ({
      ...a,
      orders: stats.get(a.id)?.orders ?? 0,
      commission_cents: stats.get(a.id)?.commissionCents ?? 0,
    })),
  });
}

export async function POST(req: Request) {
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

  let body: { code?: string; name?: string; email?: string; commissionPercent?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const code = String(body.code ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim();
  if (!/^[a-z0-9_-]{2,32}$/i.test(code)) {
    return NextResponse.json(
      { error: "Code must be 2-32 letters, numbers, - or _." },
      { status: 422 }
    );
  }
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 422 });
  }

  const percent = Number(body.commissionPercent);
  const commissionBps = Math.round(
    (Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 10) * 100
  );

  const { data, error } = await db
    .from("affiliates")
    .insert({
      code,
      name,
      email: String(body.email ?? "").trim() || null,
      commission_bps: commissionBps,
    })
    .select("id, code, name, email, commission_bps, active, created_at")
    .single();

  if (error) {
    // Unique violation on the code.
    if (error.code === "23505") {
      return NextResponse.json({ error: "That code is already in use." }, { status: 409 });
    }
    console.error("[admin/affiliates] create:", error.message);
    return NextResponse.json({ error: "Could not create that affiliate." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, affiliate: { ...data, orders: 0, commission_cents: 0 } });
}

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

  let body: { id?: string; active?: boolean; commissionPercent?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const id = String(body.id ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Unknown affiliate." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.active === "boolean") patch.active = body.active;
  if (body.commissionPercent !== undefined) {
    const percent = Number(body.commissionPercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      return NextResponse.json({ error: "Commission must be 0-100." }, { status: 422 });
    }
    patch.commission_bps = Math.round(percent * 100);
  }
  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await db
    .from("affiliates")
    .update(patch)
    .eq("id", id)
    .select("id, code, name, email, commission_bps, active, created_at")
    .maybeSingle();

  if (error || !data) {
    console.error("[admin/affiliates] update:", error?.message);
    return NextResponse.json({ error: "Could not update that affiliate." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, affiliate: data });
}
