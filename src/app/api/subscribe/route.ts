import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CODE = "LAB10";

export async function POST(req: Request) {
  let email = "";
  let source = "unknown";
  try {
    const body = await req.json();
    email = String(body.email ?? "").trim().toLowerCase();
    source = String(body.source ?? "unknown").slice(0, 40);
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  if (!EMAIL.test(email)) {
    return NextResponse.json({ error: "invalid email" }, { status: 422 });
  }

  const db = getSupabaseAdmin();
  if (db) {
    const { error } = await db
      .from("subscribers")
      // Re-submitting the same address is a no-op rather than an error: the
      // visitor should still get their code.
      .upsert({ email, source, discount_code: CODE }, { onConflict: "email" });

    if (error) {
      console.error("[subscribe] supabase:", error.message);
      return NextResponse.json({ error: "could not save" }, { status: 500 });
    }
  } else {
    console.info(`[subscribe] ${email} via ${source} (supabase not configured)`);
  }

  return NextResponse.json({ ok: true, code: CODE });
}
