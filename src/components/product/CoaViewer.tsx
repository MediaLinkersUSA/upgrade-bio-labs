"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Opens a certificate of analysis in place instead of navigating away.
 *
 * The document is served from our own /api/coa/[slug] proxy with an inline
 * disposition, so the browser's native PDF viewer renders it inside the
 * dialog. Escape closes, focus is trapped, and body scroll is locked while
 * open. Download and new-tab links stay available for anyone who wants the
 * file itself, and act as the fallback on browsers with no built-in viewer.
 *
 * Rendered through a portal to document.body. The PDP buy box is `sticky`,
 * which creates a stacking context, so a dialog rendered inline there cannot
 * out-paint the sticky nav no matter how high its z-index goes.
 */
export default function CoaViewer({
  slug,
  name,
  batch,
  className,
  children,
}: {
  slug: string;
  name: string;
  batch?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const src = `/api/coa/${slug}`;

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return setOpen(false);
      if (e.key !== "Tab") return;
      const f = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),iframe,[tabindex]:not([tabindex="-1"])'
      );
      if (!f?.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      // Return focus to whatever opened the dialog.
      openerRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        onClick={() => setOpen(true)}
        className={className}
      >
        {children ?? (
          <>
            View batch COA{batch ? ` (batch #${batch})` : ""}{" "}
            <span aria-hidden>&rarr;</span>
          </>
        )}
      </button>

      {open && mounted && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Certificate of analysis for ${name}`}
          className="fixed inset-0 z-[75] flex items-center justify-center bg-[rgba(5,46,67,0.55)] p-3 sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            ref={panelRef}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-[900px] flex-col overflow-hidden rounded-lg bg-surface shadow-pop"
          >
            <header className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="label text-teal-dark">Certificate Of Analysis</p>
                <h2 className="t-title truncate">{name}</h2>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <a
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden rounded-full px-3 py-2 text-[13.5px] font-semibold text-teal-dark hover:bg-surface-2 sm:inline-block"
                >
                  Open In New Tab
                </a>
                <a
                  href={`${src}?download=1`}
                  download={`${slug}-coa.pdf`}
                  className="rounded-full px-3 py-2 text-[13.5px] font-semibold text-teal-dark hover:bg-surface-2"
                >
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close certificate"
                  className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-ink"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                    <path
                      d="M3 3l10 10M13 3L3 13"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </header>

            <iframe
              src={src}
              title={`Certificate of analysis for ${name}`}
              className="min-h-0 flex-1 bg-surface-2"
            />

            <p className="border-t border-line-soft px-4 py-2.5 text-[12px] text-faint sm:px-5">
              Issued by an independent laboratory. Identity, purity, and net
              peptide content, plus endotoxin and heavy metals on vials.
            </p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
