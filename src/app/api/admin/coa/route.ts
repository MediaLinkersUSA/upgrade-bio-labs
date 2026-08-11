import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getProduct } from "@/data/products";

export const dynamic = "force-dynamic";

const MAX_BYTES = 20 * 1024 * 1024;

/** Uploads a replacement COA for one SKU. Admin session required. */
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
    //test
  const form = await req.formData();
  const slug = String(form.get("slug") ?? "");
  const batch = String(form.get("batch") ?? "").trim() || null;
  const file = form.get("file");

  if (!getProduct(slug)) {
    return NextResponse.json({ error: "Unknown product." }, { status: 404 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }
  // Validate the real bytes, not just the declared type: a renamed .exe would
  // otherwise be accepted and later served as application/pdf.
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "File is larger than 20MB." }, { status: 413 });
  }
  const magic = String.fromCharCode(...bytes.slice(0, 5));
  if (magic !== "%PDF-") {
    return NextResponse.json({ error: "That file is not a PDF." }, { status: 415 });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = `${slug}/${stamp}.pdf`;

  const { error: upErr } = await db.storage
    .from("coas")
    .upload(path, bytes, { contentType: "application/pdf", upsert: false });

  if (upErr) {
    console.error("[admin/coa] upload:", upErr.message);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }

  const { error: rowErr } = await db.from("coa_documents").insert({
    product_slug: slug,
    storage_path: path,
    batch,
    original_name: file.name,
    size_bytes: bytes.byteLength,
  });

  if (rowErr) {
    console.error("[admin/coa] row:", rowErr.message);
    return NextResponse.json({ error: "Saved the file but not the record." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, path });
}
