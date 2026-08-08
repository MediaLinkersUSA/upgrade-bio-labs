import { NextResponse } from "next/server";
import { getProduct } from "@/data/products";
import { getSupabaseAdmin } from "@/lib/supabase";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Back-in-stock capture. Records the address and the SKU that triggered it. */
export async function POST(req: Request) {
  let email = "";
  let slug = "";
  try {
    const body = await req.json();
    email = String(body.email ?? "").trim().toLowerCase();
    slug = String(body.slug ?? "");
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  if (!EMAIL.test(email)) {
    return NextResponse.json({ error: "invalid email" }, { status: 422 });
  }
  if (!getProduct(slug)) {
    return NextResponse.json({ error: "unknown product" }, { status: 404 });
  }

  const db = getSupabaseAdmin();
  if (db) {
    const { error } = await db
      .from("stock_requests")
      .insert({ email, product_slug: slug });

    // 23505 is a duplicate: they already asked. Treat as success.
    if (error && error.code !== "23505") {
      console.error("[notify] supabase:", error.message);
      return NextResponse.json({ error: "could not save" }, { status: 500 });
    }
  } else {
    console.info(`[notify] ${email} wants ${slug} (supabase not configured)`);
  }

  return NextResponse.json({ ok: true });
}
