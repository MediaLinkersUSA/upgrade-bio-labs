"use client";

import { useEffect, useMemo, useState } from "react";
import { money } from "@/lib/pricing";
import {
  ORDER_STATUSES,
  SHIPPED_STATUSES,
  statusLabel,
  statusTone,
} from "@/lib/order-status";

type Order = {
  id: string;
  created_at: string;
  email: string | null;
  status: string;
  total_cents: number;
  shipping_name: string | null;
  /** Present after migration 0003. */
  order_number?: string | null;
  payment_method?: string | null;
  /** Pre-migration, the reference and method ride in these instead. */
  stripe_session_id?: string | null;
  shipping_address?: Record<string, string> | null;
  /** Present after migration 0004. */
  tracking_number?: string | null;
  order_items?: { product_name: string; quantity: number; line_cents: number }[];
};

/**
 * The customer-quotable reference, wherever it happens to live.
 *
 * Zelle and CashApp payments are matched by the customer typing this into a
 * memo, so the dashboard is useless for those orders without it.
 */
const orderRef = (o: Order) =>
  o.order_number ?? o.shipping_address?.order_number ?? o.stripe_session_id ?? "-";

const payMethod = (o: Order) =>
  o.payment_method ?? o.shipping_address?.payment_method ?? "card";

const METHOD_LABEL: Record<string, string> = {
  card: "Card",
  zelle: "Zelle",
  cashapp: "CashApp",
};
type Sub = { email: string; source: string; created_at: string };
type StockReq = { email: string; product_slug: string; created_at: string };
type CoaDoc = { product_slug: string; batch: string | null; uploaded_at: string; original_name: string | null };
type Cat = { slug: string; name: string; format: string; hasLegacyCoa: boolean };

const TABS = ["Orders", "Affiliates", "Emails", "COAs"] as const;
type Tab = (typeof TABS)[number];

const date = (s: string) =>
  new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

function download(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const TONE_STYLE: Record<string, string> = {
  wait: "border-line bg-surface-2 text-muted",
  go: "border-teal/40 bg-wash text-teal-dark",
  done: "border-line-soft bg-surface-2 text-faint",
  stop: "border-warn/40 bg-surface-2 text-warn",
};

/**
 * The status dropdown, one per order row.
 *
 * Saves the moment it changes - there is no Save button, because a dashboard
 * where you pick "Shipped" and then have to confirm it is a dashboard where
 * orders quietly stay unshipped. The select shows the new value immediately
 * and rolls back if the write fails, so what is on screen is always what the
 * database will agree with once the request lands.
 */
function StatusCell({ order }: { order: Order }) {
  const [status, setStatus] = useState(order.status);
  const [tracking, setTracking] = useState(order.tracking_number ?? "");
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function save(patch: { status?: string; tracking?: string }) {
    setSaving(true);
    setNote(null);
    const previous = status;
    if (patch.status) setStatus(patch.status);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, ...patch }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(previous);
        setNote(data.error ?? "Could not save.");
      } else if (data.warning) {
        setNote(data.warning);
      }
    } catch {
      setStatus(previous);
      setNote("Could not reach the server.");
    }
    setSaving(false);
  }

  const showTracking = SHIPPED_STATUSES.includes(status);

  return (
    <div className="min-w-[190px]">
      <label className="sr-only" htmlFor={`status-${order.id}`}>
        Order status for {orderRef(order)}
      </label>
      <select
        id={`status-${order.id}`}
        value={status}
        disabled={saving}
        onChange={(e) => save({ status: e.target.value })}
        className={`w-full rounded-sm border px-2.5 py-1.5 text-[13.5px] font-medium disabled:opacity-50 ${
          TONE_STYLE[statusTone(status)] ?? TONE_STYLE.wait
        }`}
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>

      {/* Only once it has actually shipped: a tracking box on an unpaid order
          is a field nobody can fill in yet. */}
      {showTracking && (
        <input
          value={tracking}
          disabled={saving}
          onChange={(e) => setTracking(e.target.value)}
          // Saved on blur rather than per keystroke - a tracking number is
          // typed in one go, and 20 PATCHes for 20 characters is silly.
          onBlur={() => {
            if ((order.tracking_number ?? "") !== tracking) save({ tracking });
          }}
          placeholder="Tracking number"
          className="mt-1.5 w-full rounded-sm border border-line bg-surface px-2.5 py-1.5 text-[13px] placeholder:text-faint focus:border-teal focus:outline-none"
        />
      )}

      {note && (
        <p role="status" className="mt-1 text-[12px] leading-snug text-warn">
          {note}
        </p>
      )}
    </div>
  );
}

export default function AdminDashboard({
  supabaseReady,
  orders,
  subscribers,
  stockRequests,
  coaDocs,
  catalog,
}: {
  supabaseReady: boolean;
  orders: Order[];
  subscribers: Sub[];
  stockRequests: StockReq[];
  coaDocs: CoaDoc[];
  catalog: Cat[];
}) {
  const [tab, setTab] = useState<Tab>("Orders");

  const revenue = useMemo(
    () => orders.reduce((s, o) => s + (o.total_cents ?? 0), 0) / 100,
    [orders]
  );

  const latestCoa = useMemo(() => {
    const m = new Map<string, CoaDoc>();
    for (const d of coaDocs) if (!m.has(d.product_slug)) m.set(d.product_slug, d);
    return m;
  }, [coaDocs]);

  return (
    <div className="container-site py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label text-teal-dark">Upgrade Bio Labs</p>
          <h1 className="t-display-lg mt-1">Dashboard</h1>
        </div>
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/admin/login", { method: "DELETE" });
            window.location.reload();
          }}
          className="btn-ghost"
        >
          Sign Out
        </button>
      </header>

      {!supabaseReady && (
        <p className="mt-6 rounded-md border border-warn/40 bg-surface-2 p-4 text-[14.5px] text-ink">
          Supabase is not connected yet, so orders and emails will read as empty.
          Add <code className="rounded bg-surface px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="rounded bg-surface px-1">SUPABASE_SERVICE_ROLE_KEY</code>, then run the
          migrations in <code className="rounded bg-surface px-1">supabase/migrations</code>.
        </p>
      )}

      <dl className="mt-7 grid gap-4 sm:grid-cols-3">
        {[
          ["Orders", String(orders.length)],
          ["Revenue", money(revenue)],
          ["Email Subscribers", String(subscribers.length)],
        ].map(([k, v]) => (
          <div key={k} className="card p-5">
            <dt className="label text-muted">{k}</dt>
            <dd className="t-display-md mt-1">{v}</dd>
          </div>
        ))}
      </dl>

      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Dashboard sections">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className="rounded-full border px-4 py-2 text-[14px] font-medium transition-colors"
            style={{
              borderColor: tab === t ? "var(--color-teal)" : "var(--color-line)",
              background: tab === t ? "var(--color-wash)" : "transparent",
              color: tab === t ? "var(--color-teal-dark)" : "var(--color-ink)",
            }}
          >
            {t}
          </button>
        ))}
      </nav>

      {/* ---------------------------------------------------------- orders */}
      {tab === "Orders" && (
        <section className="mt-6">
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() =>
                download(
                  "orders.csv",
                  toCsv(
                    orders.map((o) => ({
                      date: o.created_at,
                      order_number: orderRef(o),
                      payment_method: payMethod(o),
                      email: o.email,
                      name: o.shipping_name,
                      // The label, not the id: this file gets opened in
                      // Excel by someone who never sees the codebase.
                      status: statusLabel(o.status),
                      tracking: o.tracking_number ?? "",
                      total: (o.total_cents / 100).toFixed(2),
                      items: (o.order_items ?? [])
                        .map((i) => `${i.quantity}x ${i.product_name}`)
                        .join(" | "),
                    }))
                  )
                )
              }
              className="text-[14px] font-semibold text-teal-dark hover:underline"
            >
              Export CSV
            </button>
          </div>
          {orders.length === 0 ? (
            <p className="rounded-md border border-line-soft bg-surface p-8 text-center text-[15px] text-muted">
              No orders yet. Every order placed on the site lands here automatically.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-line-soft bg-surface">
              <table className="w-full min-w-[680px] text-left text-[14px]">
                <thead className="border-b border-line-soft">
                  <tr className="label text-muted">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Order #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{date(o.created_at)}</td>
                      <td className="px-4 py-3">
                        <span className="data block font-semibold">{orderRef(o)}</span>
                        <span className="block text-[12.5px] text-muted">
                          {METHOD_LABEL[payMethod(o)] ?? payMethod(o)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block font-medium">{o.shipping_name ?? "-"}</span>
                        <span className="block text-[13px] text-muted">{o.email}</span>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {(o.order_items ?? []).map((i) => `${i.quantity}x ${i.product_name}`).join(", ") || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusCell order={o} />
                      </td>
                      <td className="data px-4 py-3 text-right font-semibold">
                        {money(o.total_cents / 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------------- affiliates */}
      {tab === "Affiliates" && <AffiliatesPanel />}

      {/* ---------------------------------------------------------- emails */}
      {tab === "Emails" && (
        <section className="mt-6 grid gap-8 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="t-title">Subscribers ({subscribers.length})</h2>
              <button
                type="button"
                onClick={() => download("subscribers.csv", toCsv(subscribers as unknown as Record<string, unknown>[]))}
                className="text-[14px] font-semibold text-teal-dark hover:underline"
              >
                Export CSV
              </button>
            </div>
            {subscribers.length === 0 ? (
              <p className="rounded-md border border-line-soft bg-surface p-6 text-[15px] text-muted">
                No subscribers yet.
              </p>
            ) : (
              <ul className="divide-y divide-line-soft rounded-md border border-line-soft bg-surface">
                {subscribers.map((s) => (
                  <li key={s.email} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[14px]">
                    <span className="truncate">{s.email}</span>
                    <span className="shrink-0 text-[12.5px] text-muted">
                      {s.source} · {date(s.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="t-title mb-3">Back-In-Stock Requests ({stockRequests.length})</h2>
            {stockRequests.length === 0 ? (
              <p className="rounded-md border border-line-soft bg-surface p-6 text-[15px] text-muted">
                Nobody waiting on a restock right now.
              </p>
            ) : (
              <ul className="divide-y divide-line-soft rounded-md border border-line-soft bg-surface">
                {stockRequests.map((r, i) => (
                  <li key={`${r.email}-${i}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[14px]">
                    <span className="truncate">{r.email}</span>
                    <span className="shrink-0 text-[12.5px] text-muted">{r.product_slug}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------ COAs */}
      {tab === "COAs" && <CoaManager catalog={catalog} latest={latestCoa} />}
    </div>
  );
}

type Affiliate = {
  id: string;
  code: string;
  name: string;
  email: string | null;
  commission_bps: number;
  active: boolean;
  created_at: string;
  orders: number;
  commission_cents: number;
};

/**
 * Affiliate roster: who has a ?ref= link, what they earn, and what they've
 * generated so far. Fetches its own data rather than taking it as a prop from
 * the server component, since it's the one tab a normal shift never opens.
 */
function AffiliatesPanel() {
  const [affiliates, setAffiliates] = useState<Affiliate[] | null>(null);
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("");

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [rate, setRate] = useState("10");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/affiliates");
    const body = await res.json().catch(() => ({}));
    if (res.ok) setAffiliates(body.affiliates);
    else setError(body.error ?? "Could not load affiliates.");
  }

  useEffect(() => {
    load();
    setOrigin(window.location.origin);
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFormError("");
    const res = await fetch("/api/admin/affiliates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name, commissionPercent: Number(rate) }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      setCode("");
      setName("");
      setRate("10");
      await load();
    } else {
      setFormError(body.error ?? "Could not create that affiliate.");
    }
    setCreating(false);
  }

  async function toggleActive(a: Affiliate) {
    setAffiliates((cur) =>
      cur ? cur.map((x) => (x.id === a.id ? { ...x, active: !a.active } : x)) : cur
    );
    const res = await fetch("/api/admin/affiliates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, active: !a.active }),
    });
    if (!res.ok) load(); // roll back to the real state on failure
  }

  const totalOwed = useMemo(
    () => (affiliates ?? []).reduce((s, a) => s + a.commission_cents, 0) / 100,
    [affiliates]
  );

  return (
    <section className="mt-6 grid gap-8 lg:grid-cols-[380px_1fr]">
      <form onSubmit={create} className="card h-fit p-6">
        <h2 className="t-title">Add An Affiliate</h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
          They share links like <code className="rounded bg-surface-2 px-1">{origin || SITE_URL_PLACEHOLDER}/?ref=
          <span className="text-teal-dark">{code || "code"}</span></code>. Anyone who orders after
          clicking one is credited to them for 30 days.
        </p>

        <label htmlFor="aff-code" className="label mb-2 mt-5 block text-muted">Referral Code</label>
        <input
          id="aff-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\s+/g, ""))}
          placeholder="sarah"
          required
          className="w-full rounded-sm border border-line bg-surface px-3 py-3 text-[15px]"
        />

        <label htmlFor="aff-name" className="label mb-2 mt-4 block text-muted">Name</label>
        <input
          id="aff-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sarah Chen"
          required
          className="w-full rounded-sm border border-line bg-surface px-3 py-3 text-[15px]"
        />

        <label htmlFor="aff-rate" className="label mb-2 mt-4 block text-muted">
          Commission <span className="normal-case tracking-normal">(% of order, excl. shipping)</span>
        </label>
        <input
          id="aff-rate"
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="w-full rounded-sm border border-line bg-surface px-3 py-3 text-[15px]"
        />

        <button type="submit" disabled={creating} className="btn-primary mt-5 w-full">
          {creating ? "adding..." : "add affiliate"}
        </button>

        {formError && <p className="mt-3 text-[13.5px] text-warn">{formError}</p>}
      </form>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="t-title">Affiliates ({affiliates?.length ?? 0})</h2>
          {affiliates && affiliates.length > 0 && (
            <span className="text-[14px] text-muted">
              Total owed: <span className="font-semibold text-ink">{money(totalOwed)}</span>
            </span>
          )}
        </div>

        {error && <p className="text-[14px] text-warn">{error}</p>}

        {affiliates === null ? (
          <p className="text-[14px] text-muted">Loading...</p>
        ) : affiliates.length === 0 ? (
          <p className="rounded-md border border-line-soft bg-surface p-8 text-center text-[15px] text-muted">
            No affiliates yet. Add one on the left to get a shareable link.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-line-soft bg-surface">
            <table className="w-full min-w-[600px] text-left text-[14px]">
              <thead className="border-b border-line-soft">
                <tr className="label text-muted">
                  <th className="px-4 py-3">Affiliate</th>
                  <th className="px-4 py-3">Rate</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3 text-right">Owed</th>
                  <th className="px-4 py-3">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {affiliates.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3">
                      <span className="block font-medium">{a.name}</span>
                      <span className="data block text-[12.5px] text-muted">?ref={a.code}</span>
                    </td>
                    <td className="px-4 py-3 text-muted">{(a.commission_bps / 100).toFixed(1)}%</td>
                    <td className="data px-4 py-3 text-right">{a.orders}</td>
                    <td className="data px-4 py-3 text-right font-semibold">
                      {money(a.commission_cents / 100)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleActive(a)}
                        className="rounded-full border px-3 py-1 text-[12.5px] font-medium"
                        style={{
                          borderColor: a.active ? "var(--color-teal)" : "var(--color-line)",
                          background: a.active ? "var(--color-wash)" : "transparent",
                          color: a.active ? "var(--color-teal-dark)" : "var(--color-muted)",
                        }}
                      >
                        {a.active ? "Active" : "Paused"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

const SITE_URL_PLACEHOLDER = "yoursite.com";

function CoaManager({
  catalog,
  latest,
}: {
  catalog: Cat[];
  latest: Map<string, CoaDoc>;
}) {
  const [slug, setSlug] = useState(catalog[0]?.slug ?? "");
  const [batch, setBatch] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [q, setQ] = useState("");

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setState("sending");
    const fd = new FormData();
    fd.set("slug", slug);
    fd.set("batch", batch);
    fd.set("file", file);
    const res = await fetch("/api/admin/coa", { method: "POST", body: fd });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      setState("done");
      setMessage("Uploaded. It is live on the product page now.");
      setTimeout(() => window.location.reload(), 1200);
    } else {
      setState("error");
      setMessage(body.error ?? "Upload failed.");
    }
  }

  const rows = catalog.filter((c) =>
    q ? c.name.toLowerCase().includes(q.toLowerCase()) : true
  );

  return (
    <section className="mt-6 grid gap-8 lg:grid-cols-[380px_1fr]">
      <form onSubmit={upload} className="card h-fit p-6">
        <h2 className="t-title">Upload A New COA</h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
          Replaces the document shown on that product page. The previous version
          is kept, so nothing is lost.
        </p>

        <label htmlFor="coa-slug" className="label mb-2 mt-5 block text-muted">Product</label>
        <select
          id="coa-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-full rounded-sm border border-line bg-surface px-3 py-3 text-[15px]"
        >
          {catalog.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>

        <label htmlFor="coa-batch" className="label mb-2 mt-4 block text-muted">
          Batch Number <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <input
          id="coa-batch"
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
          placeholder="B2604-K"
          className="w-full rounded-sm border border-line bg-surface px-3 py-3 text-[15px]"
        />

        <label htmlFor="coa-file" className="label mb-2 mt-4 block text-muted">PDF</label>
        <input
          id="coa-file"
          type="file"
          accept="application/pdf"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-[14px] file:mr-3 file:rounded-full file:border-0 file:bg-navy file:px-4 file:py-2 file:text-[14px] file:font-semibold file:text-white"
        />

        <button type="submit" disabled={state === "sending" || !file} className="btn-primary mt-5 w-full">
          {state === "sending" ? "uploading..." : "upload COA"}
        </button>

        {message && (
          <p
            className="mt-3 text-[13.5px]"
            style={{ color: state === "error" ? "var(--color-warn)" : "var(--color-success)" }}
          >
            {message}
          </p>
        )}
      </form>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="t-title">Documents By Product</h2>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            aria-label="Search products"
            className="w-[180px] rounded-full border border-line bg-surface px-4 py-2 text-[14px]"
          />
        </div>
        <div className="overflow-x-auto rounded-md border border-line-soft bg-surface">
          <table className="w-full min-w-[560px] text-left text-[14px]">
            <thead className="border-b border-line-soft">
              <tr className="label text-muted">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Current Document</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {rows.map((c) => {
                const doc = latest.get(c.slug);
                return (
                  <tr key={c.slug}>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-muted">
                      {doc ? (
                        <span className="text-success">Uploaded{doc.batch ? ` · ${doc.batch}` : ""}</span>
                      ) : c.hasLegacyCoa ? (
                        "Original site document"
                      ) : (
                        <span className="text-warn">None Published</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {doc ? date(doc.uploaded_at) : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
