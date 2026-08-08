"use client";

import { useState } from "react";

export const REDESIGN_ACK_KEY = "ubl_redesign_ack";

/**
 * Blocking snippet for <head>. Stamps the root element before first paint if
 * the visitor has already dismissed the notice.
 *
 * The notice is rendered server-side and hidden by CSS rather than mounted
 * client-side, because a bar that appears after hydration pushes the entire
 * page down — a guaranteed layout shift at the very top of the document, on
 * every load, for every returning visitor.
 */
export const redesignAckScript = `try{if(localStorage.getItem('${REDESIGN_ACK_KEY}'))document.documentElement.classList.add('redesign-ack')}catch(e){}`;

/**
 * Reassurance for returning customers who last saw the old storefront.
 *
 * The anxiety being answered is "is this the right site, or a clone?", so the
 * copy leads with sameness and only then mentions the redesign. "Upgraded
 * design" as an opener reads as marketing and, on a brand called Upgrade Bio
 * Labs, is also ambiguous about what got upgraded.
 *
 * Sits under the nav rather than inside the sticky announcement bar: it is a
 * one-time orientation message, not a standing claim, so it should scroll away
 * and never return once acknowledged.
 */
export default function RedesignNotice() {
  const [dismissed, setDismissed] = useState(false);

  return (
    <div
      className="redesign-notice relative overflow-hidden"
      hidden={dismissed || undefined}
    >
      {/* Celebratory rather than administrative. The old flat strip read like a
          cookie banner, which is the one thing a "we relaunched" message must
          not look like: people dismiss those without reading them. */}
      <div className="redesign-sheen absolute inset-0" aria-hidden />

      <div className="container-site relative flex items-center gap-4 py-3">
        {/* Centred, with the dismiss button absolutely placed so the copy
            centres on the band rather than on the space left beside it. */}
        <p className="flex flex-1 flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-center text-[14px] leading-snug text-white">
          <span aria-hidden className="text-[17px] leading-none">
            ✨
          </span>
          <strong className="font-semibold">
            Same Upgrade Bio Labs, brand-new website.
          </strong>
          <span className="text-white/75">
            Same team, same peptides, same third-party testing.
          </span>
        </p>

        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(REDESIGN_ACK_KEY, "1");
            } catch {
              /* ignore */
            }
            setDismissed(true);
          }}
          aria-label="Dismiss"
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-2 text-white/70 transition-colors hover:bg-white/15 hover:text-white md:right-8"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
            <path
              d="M3 3l10 10M13 3L3 13"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
