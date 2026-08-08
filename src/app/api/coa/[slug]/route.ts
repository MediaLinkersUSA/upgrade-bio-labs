import { getProduct } from "@/data/products";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * Streams a product's certificate of analysis from our own origin.
 *
 * Proxied rather than linked directly for three reasons: it lets the document
 * be framed in the on-page viewer regardless of what headers the upstream host
 * sets later, it forces `inline` disposition so the browser renders instead of
 * downloading, and it means the visitor never leaves the site to read a COA.
 *
 * Only slugs present in our catalog resolve, and the upstream URL comes from
 * the catalog rather than the request, so this cannot be pointed at an
 * arbitrary host.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) {
    return new Response("Unknown product.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // A document uploaded through the admin dashboard always wins over the
  // legacy WordPress URL, so the client can replace a COA without a developer.
  let sourceUrl = product.coaUrl;
  const db = getSupabaseAdmin();
  if (db) {
    const { data } = await db
      .from("coa_documents")
      .select("storage_path")
      .eq("product_slug", slug)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.storage_path) {
      const signed = await db.storage
        .from("coas")
        .createSignedUrl(data.storage_path, 300);
      if (signed.data?.signedUrl) sourceUrl = signed.data.signedUrl;
    }
  }

  if (!sourceUrl) {
    return new Response("No certificate published for this product.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  let upstream: Response;
  try {
    upstream = await fetch(sourceUrl, {
      headers: { "User-Agent": "UpgradeBioLabs-Storefront" },
      next: { revalidate: 86_400 },
    });
  } catch {
    return new Response("Certificate is temporarily unavailable.", {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response("Certificate is temporarily unavailable.", {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const filename = `${product.slug}-coa.pdf`;
  // ?download=1 flips disposition so the header link saves the file.
  const wantsDownload = new URL(req.url).searchParams.get("download") === "1";

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "application/pdf",
      // inline, not attachment: the point is to render it in place.
      "Content-Disposition": `${wantsDownload ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
