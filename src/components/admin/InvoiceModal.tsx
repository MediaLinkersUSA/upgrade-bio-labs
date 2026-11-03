"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Logo from "@/components/chrome/Logo";
import { SITE } from "@/lib/config";
import { money } from "@/lib/pricing";

/** Everything the invoice shows, already worked out by the dashboard. */
export type InvoiceData = {
  ref: string;
  createdAt: string;
  name: string;
  /** Address lines without the name. */
  address: string[];
  email: string;
  phone: string;
  method: string;
  status: string;
  notes: string;
  items: { name: string; size: string; qty: number; unitCents: number }[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
};

const TZ = "America/New_York";

const fmt = (c: number) => money(c / 100);

/**
 * Printable invoice in a popup, opened from the orders table.
 *
 * Printing: the popup is portalled straight into <body>, and the print
 * stylesheet hides every other child of <body>, so the browser prints the
 * invoice alone, on white, with no admin chrome and no blank trailing page.
 */
export default function InvoiceModal({
  invoice: inv,
  onClose,
}: {
  invoice: InvoiceData;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const d = new Date(inv.createdAt);
  const dateText = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  });
  const timeText = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: TZ,
  });

  return createPortal(
    <div
      className="invoice-portal fixed inset-0 z-[90] overflow-y-auto bg-[#f3f4f8] p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Invoice ${inv.ref}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <style>{`
        @page { margin: 14mm; }
        @media print {
          body > *:not(.invoice-portal) { display: none !important; }
          .invoice-portal {
            position: static !important;
            overflow: visible !important;
            background: #fff !important;
            padding: 0 !important;
          }
          .invoice-sheet {
            box-shadow: none !important;
            border: 0 !important;
            border-radius: 0 !important;
            max-width: none !important;
            padding: 0 !important;
          }
          .invoice-sheet, .invoice-sheet * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .invoice-row { break-inside: avoid; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="invoice-sheet mx-auto w-full max-w-[900px] rounded-2xl bg-white p-5 text-[#111] shadow-xl sm:p-8">
        {/* header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="scale-125 origin-left pt-2">
            <Logo />
          </div>
          <div className="text-right">
            <span className="inline-block rounded-full bg-black px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white">
              Order
            </span>
            <p className="mt-2 text-[15px] font-bold">{inv.ref}</p>
            <p className="text-[13px] text-[#777]">
              {dateText} · {timeText} ET
            </p>
          </div>
        </div>
        <div className="my-6 h-[3px] rounded bg-gradient-to-r from-black to-[#ccc]" />

        {/* bill / ship */}
        <div className="invoice-row rounded-xl border border-[#e7e7ea] bg-[#fafafa] p-5">
          <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-[#888]">
            Billing / Shipping
          </p>
          <p className="text-[17px] font-semibold">{inv.name || "-"}</p>
          <div className="mt-1 text-[14px] leading-[1.45]">
            {inv.address.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
            {inv.email && <p>{inv.email}</p>}
            {inv.phone && <p>{inv.phone}</p>}
          </div>
          <p className="mt-3 text-[12.5px] text-[#777]">
            Payment: {inv.method} · Status: {inv.status}
          </p>
        </div>

        {/* items */}
        <div className="mt-6 space-y-3">
          {inv.items.map((it, i) => (
            <div
              key={i}
              className="invoice-row flex items-center justify-between gap-4 rounded-xl border border-[#e7e7ea] bg-[#f6f7fa] px-5 py-4"
            >
              <div className="min-w-0">
                <p className="text-[15.5px] font-semibold">
                  {it.name}
                  {it.size ? ` - ${it.size}` : ""}
                </p>
                <p className="text-[13px] text-[#777]">Quantity: {it.qty}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[12px] text-[#888]">Unit Price</p>
                <p className="text-[17px] font-bold">{fmt(it.unitCents)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* totals */}
        <div className="invoice-row ml-auto mt-6 w-full max-w-[320px] text-[14.5px]">
          <div className="flex justify-between py-1">
            <span className="text-[#555]">Subtotal</span>
            <span>{fmt(inv.subtotalCents)}</span>
          </div>
          {inv.discountCents > 0 && (
            <div className="flex justify-between py-1">
              <span className="text-[#555]">Discount</span>
              <span>-{fmt(inv.discountCents)}</span>
            </div>
          )}
          <div className="flex justify-between py-1">
            <span className="text-[#555]">Shipping</span>
            <span>{fmt(inv.shippingCents)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between rounded-xl bg-black px-4 py-3 text-white print:border print:border-black">
            <span className="font-semibold">Total</span>
            <span className="text-[20px] font-bold">{fmt(inv.totalCents)}</span>
          </div>
        </div>

        {inv.notes && (
          <p className="invoice-row mt-6 text-[13px] text-[#555]">
            <span className="font-semibold">Order notes:</span> {inv.notes}
          </p>
        )}

        {/* actions: screen only */}
        <div className="no-print mt-8 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-black px-6 py-2.5 text-[14px] font-semibold text-white"
          >
            Print Invoice
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#ccc] bg-white px-6 py-2.5 text-[14px] font-semibold"
          >
            Close
          </button>
        </div>
        <p className="mt-6 text-center text-[12px] text-[#999]">
          &copy; {d.getFullYear()} {SITE.name}. All Rights Reserved.
        </p>
      </div>
    </div>,
    document.body
  );
}
