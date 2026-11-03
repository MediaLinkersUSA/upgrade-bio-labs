import type { Metadata } from "next";
import { isAdmin, isAdminConfigured } from "@/lib/admin-auth";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { products } from "@/data/products";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

// Always rendered per request: this page reads live orders.
export const dynamic = "force-dynamic";

type SearchRow = {
  email?: string | null;
  shipping_name?: string | null;
  phone?: string | null;
  order_number?: string | null;
  stripe_session_id?: string | null;
  shipping_address?: Record<string, string> | null;
};

const digits = (s: string) => s.replace(/\D/g, "");

/** True when every word typed appears somewhere in the order's name, email,
 *  phone or order number. Phones compare as digits only, so "555-123-4567",
 *  "(555) 123 4567" and "5551234567" all find the same customer. The "#" and
 *  "UBL-" prefix are optional, so "32725" finds UBL-32725. */
function matches(o: SearchRow, q: string): boolean {
  const addr = o.shipping_address ?? {};
  const text = [
    o.shipping_name,
    o.email,
    o.order_number ?? addr.order_number ?? o.stripe_session_id,
    o.phone ?? addr.phone,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const phoneDigits = digits(String(o.phone ?? addr.phone ?? ""));
  return q
    .toLowerCase()
    .replace(/#/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => text.includes(w) || (digits(w).length >= 3 && phoneDigits.includes(digits(w))));
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  if (!(await isAdmin())) {
    return <AdminLogin configured={isAdminConfigured()} />;
  }

  const db = getSupabaseAdmin();

  const rawQ = (await searchParams).q;
  const q = (Array.isArray(rawQ) ? rawQ[0] : rawQ)?.trim().slice(0, 100) ?? "";

  const [orders, subscribers, stockRequests, coaDocs] = db
    ? await Promise.all([
        db
          .from("orders")
          // `*` rather than a column list: the order reference lives in order_number
          // after migration 0004 and in stripe_session_id before it, and naming a
          // column that does not exist fails the whole query.
          .select("*,order_items(*)")
          .order("created_at", { ascending: false })
          // A search looks further back than the default list, then trims.
          .limit(q ? 2000 : 100),
        db.from("subscribers").select("email,source,created_at").order("created_at", { ascending: false }).limit(200),
        db
          .from("stock_requests")
          .select("email,product_slug,created_at")
          .is("notified_at", null)
          .order("created_at", { ascending: false })
          .limit(200),
        db
          .from("coa_documents")
          .select("product_slug,batch,uploaded_at,original_name")
          .order("uploaded_at", { ascending: false })
          .limit(200),
      ])
    : [null, null, null, null];

  return (
    <AdminDashboard
      supabaseReady={isSupabaseConfigured()}
      orders={
        q
          ? (orders?.data ?? []).filter((o) => matches(o, q)).slice(0, 200)
          : (orders?.data ?? [])
      }
      searchQuery={q}
      subscribers={subscribers?.data ?? []}
      stockRequests={stockRequests?.data ?? []}
      coaDocs={coaDocs?.data ?? []}
      catalog={products.map((p) => ({
        slug: p.slug,
        name: p.name,
        format: p.format,
        hasLegacyCoa: Boolean(p.coaUrl),
      }))}
    />
  );
}
