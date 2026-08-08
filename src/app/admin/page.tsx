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

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return <AdminLogin configured={isAdminConfigured()} />;
  }

  const db = getSupabaseAdmin();

  const [orders, subscribers, stockRequests, coaDocs] = db
    ? await Promise.all([
        db
          .from("orders")
          // `*` rather than a column list: the order reference lives in order_number
          // after migration 0004 and in stripe_session_id before it, and naming a
          // column that does not exist fails the whole query.
          .select("*,order_items(product_name,quantity,line_cents)")
          .order("created_at", { ascending: false })
          .limit(100),
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
      orders={orders?.data ?? []}
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
