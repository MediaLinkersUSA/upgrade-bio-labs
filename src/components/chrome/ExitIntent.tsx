"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/components/cart/CartProvider";

const SESSION_KEY = "ubl_exit_shown";
const SUB_KEY = "ubl_subscribed";
const ARM_DELAY = 20_000; // never within 20s of arrival
const CODE = "LAB10";

/**
 * Offer-led email capture.
 *
 * The number is the headline, not the label above it: a discount popup that
 * leads with "before you go" is asking for attention before it has earned any.
 * One field, because each additional one costs roughly a tenth of completions,
 * and the code is revealed inline on submit rather than only emailed.
 *
 * Portalled to body so it cannot be trapped inside a sticky stacking context.
 */
export default function ExitIntent() {
  const { items } = useCart();
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [copied, setCopied] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      if (localStorage.getItem(SUB_KEY)) return;
    } catch {
      return;
    }
    if (items.length > 0) return;

    let armed = false;
    const arm = setTimeout(() => (armed = true), ARM_DELAY);

    const fire = () => {
      if (!armed) return;
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* ignore */
      }
      setShow(true);
      cleanup();
    };

    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) fire();
    };

    let lastY = window.scrollY;
    let lastT = Date.now();
    const onScroll = () => {
      const y = window.scrollY;
      const t = Date.now();
      const depth = (y + window.innerHeight) / document.body.scrollHeight;
      const v = (lastY - y) / Math.max(1, t - lastT);
      if (depth > 0.4 && v > 1.2) fire();
      lastY = y;
      lastT = t;
    };

    const cleanup = () => {
      document.removeEventListener("mouseout", onLeave);
      window.removeEventListener("scroll", onScroll);
      clearTimeout(arm);
    };

    document.addEventListener("mouseout", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    return cleanup;
  }, [items.length]);

  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setShow(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [show]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "exit-intent" }),
      });
      setState(res.ok ? "done" : "error");
      if (res.ok) localStorage.setItem(SUB_KEY, "1");
    } catch {
      setState("error");
    }
  }

  if (!show || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-title"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(5,46,67,0.5)] p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onClick={() => setShow(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[420px] overflow-hidden rounded-t-lg bg-surface shadow-pop sm:rounded-lg"
      >
        <button
          type="button"
          onClick={() => setShow(false)}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full bg-surface/80 p-2 text-muted backdrop-blur-sm hover:text-ink"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden>
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>

        {/* Product imagery, so the offer is attached to something real. */}
        <div className="relative h-[150px] w-full sm:h-[180px]">
          <Image
            src="/sections/hero.webp"
            alt=""
            fill
            sizes="420px"
            className="object-cover"
          />
        </div>

        <div className="p-7 text-center">
          {state === "done" ? (
            <>
              <h2 id="exit-title" className="t-display-md">You&apos;re in.</h2>
              <p className="mt-2 text-[15px] text-muted">Use this at checkout:</p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(CODE);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                }}
                className="mt-3 w-full rounded-full border-2 border-dashed border-teal bg-wash py-3.5 font-mono text-[24px] font-bold tracking-[0.08em] text-teal-dark"
              >
                {CODE}
              </button>
              <p className="mt-2 text-[13px] text-muted">
                {copied ? "Copied to clipboard" : "Tap to copy. Also sent to your inbox."}
              </p>
            </>
          ) : (
            <>
              <h2 id="exit-title" className="t-display-xl leading-none">
                25% off
              </h2>
              <p className="mt-1 text-[17px] font-semibold text-ink">
                your first order
              </p>
              <p className="mx-auto mt-3 max-w-[32ch] text-[14.5px] leading-relaxed text-muted">
                Plus first access to restocks, new compounds, and fresh COAs.
              </p>

              <form onSubmit={submit} className="mt-5">
                <label htmlFor="exit-email" className="sr-only">Email address</label>
                <input
                  id="exit-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@lab.com"
                  className="w-full rounded-full border border-line bg-surface px-5 py-3.5 text-center text-[15px] text-ink placeholder:text-faint focus:border-teal focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={state === "sending"}
                  className="btn-primary mt-3 w-full"
                >
                  {state === "sending" ? "Sending..." : "Reveal My Code"}
                </button>
                {state === "error" && (
                  <p className="mt-2 text-[13.5px] text-warn">That did not send. Try again.</p>
                )}
              </form>

              <button
                type="button"
                onClick={() => setShow(false)}
                className="mt-4 text-[13.5px] text-muted underline underline-offset-2 hover:text-ink"
              >
                No Thanks, I&apos;ll Pay Full Price
              </button>

              <p className="mt-4 text-[11.5px] leading-relaxed text-faint">
                Research use only. One code per customer. Does not combine with bundle
                savings; quantity pricing still applies. Unsubscribe any time.
              </p>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
