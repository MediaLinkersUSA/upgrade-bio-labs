"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "ubl_age_ok";

/**
 * Legal overlay, not a loading screen. It mounts in useEffect so the page has
 * already painted and is interactive behind it. The live site fires its 21+
 * modal before anything renders, which costs it the first paint.
 * No email field: a legal gate should not be contaminated with marketing.
 */
export default function AgeGate() {
  const [show, setShow] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(KEY)) setShow(true);
    } catch {
      /* private mode: skip the gate rather than trap the visitor */
    }
  }, []);

  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [show]);

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(5,46,67,0.45)] p-5 backdrop-blur-md"
    >
      <div className="w-full max-w-[460px] rounded-lg border border-line-soft bg-surface p-7 text-center shadow-pop">
        <p className="label text-teal-dark">Research Use Only</p>
        <h2 id="age-gate-title" className="t-display-md mt-3 text-balance">
          Researcher Verification
        </h2>
        <p className="mx-auto mt-3 max-w-[40ch] text-[15px] leading-relaxed text-muted">
          Upgrade Bio Labs supplies research peptides to qualified researchers
          and laboratories for in-vitro and laboratory use only. Please confirm
          before continuing.
        </p>

        {/* An explicit checkbox rather than a single "I confirm" button. The
            affirmation is the point of the gate, so it has to be an action the
            visitor takes deliberately, not a side effect of wanting to get in. */}
        <label
          htmlFor="age-gate-confirm"
          className="mt-6 flex cursor-pointer items-start gap-3 rounded-md border border-line bg-surface-2 p-4 text-left"
        >
          <input
            id="age-gate-confirm"
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-[19px] w-[19px] shrink-0 accent-[var(--color-teal)]"
          />
          <span className="text-[14.5px] leading-relaxed text-ink">
            I am at least <strong className="font-semibold">21 years of age</strong>{" "}
            and acquiring these products for{" "}
            <strong className="font-semibold">laboratory and research use only</strong>
            , not for human or veterinary use.
          </span>
        </label>

        <button
          type="button"
          disabled={!agreed}
          onClick={() => {
            try {
              sessionStorage.setItem(KEY, "1");
            } catch {
              /* ignore */
            }
            setShow(false);
          }}
          className="btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-40"
        >
          Enter Site <span aria-hidden>&rarr;</span>
        </button>

        <p className="mt-4 text-[12px] leading-relaxed text-faint">
          Products are for research use only, not for human or veterinary use,
          and have not been evaluated by the Food and Drug Administration.{" "}
          <Link href="/quality" className="underline underline-offset-2 hover:text-muted">
            Full disclaimer.
          </Link>
        </p>
        <p className="mt-3 text-[13.5px] text-muted">
          Not a researcher?{" "}
          <a
            href="https://www.google.com"
            className="font-semibold underline underline-offset-2 hover:text-ink"
          >
            Exit
          </a>
        </p>
      </div>
    </div>
  );
}
