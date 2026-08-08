"use client";

import { useState } from "react";

const CODE = "LAB10";

/** One field. Every extra field costs roughly a tenth of completions, and the
 *  code is shown inline on submit rather than only emailed. */
export default function EmailCapture() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "inline" }),
      });
      setState(res.ok ? "done" : "error");
      if (res.ok) {
        try {
          localStorage.setItem("ubl_subscribed", "1");
        } catch {
          /* ignore */
        }
      }
    } catch {
      setState("error");
    }
  }

  return (
    <section className="section-round-top bg-navy text-white">
      <div className="container-site grid items-center gap-6 py-12 md:grid-cols-2">
        <div>
          <h2 className="t-display-md">First To Know.</h2>
          <p className="mt-2 text-[15px] text-white/70">
            Restocks, new compounds, and fresh COAs. Plus 25% off your first order.
          </p>
        </div>

        {state === "done" ? (
          <div className="rounded-md bg-white/[0.08] p-5">
            <p className="text-[15px]">Use this at checkout:</p>
            <p className="mt-1 font-mono text-[24px] font-semibold text-[var(--color-teal-on-navy)]">{CODE}</p>
            <p className="mt-1 text-[13.5px] text-white/60">
              We have emailed it to you as well.
            </p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label htmlFor="subscribe-email" className="label mb-2 block text-white/60">
              Email Address
            </label>
            <div className="relative">
              <input
                id="subscribe-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@lab.com"
                className="w-full rounded-full bg-white py-4 pl-5 pr-14 text-[15px] text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-teal-bright"
              />
              <button
                type="submit"
                disabled={state === "sending"}
                aria-label="Subscribe"
                className="absolute right-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-navy text-white transition-colors hover:bg-teal"
              >
                <span aria-hidden>&rarr;</span>
              </button>
            </div>
            {state === "error" && (
              <p className="mt-2 text-[13.5px] text-white/80">
                That did not send. Try again.
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
