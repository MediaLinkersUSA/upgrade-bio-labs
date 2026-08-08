"use client";

import { useEffect, useState } from "react";
import { SHIPPING_THRESHOLD, SHIP_CUTOFF, SHIP_CUTOFF_HOUR_ET } from "@/lib/config";

/** Counts down to the same-day dispatch cutoff, so the urgency is real rather
 *  than decorative. Returns null once the cutoff has passed for the day.
 *
 *  The hour comes from config alongside the label it is shown next to: when
 *  those drifted apart the bar promised 2pm while counting down to 3pm. */
function useCutoffCountdown(cutoffHourEt = SHIP_CUTOFF_HOUR_ET) {
  const [left, setLeft] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const et = new Date(
        now.toLocaleString("en-US", { timeZone: "America/New_York" })
      );
      const day = et.getDay();
      const cutoff = new Date(et);
      cutoff.setHours(cutoffHourEt, 0, 0, 0);

      const isWeekend = day === 0 || day === 6;
      const ms = cutoff.getTime() - et.getTime();
      if (isWeekend || ms <= 0) return setLeft(null);

      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1000);
      setLeft(
        h > 0
          ? `${h}h ${String(m).padStart(2, "0")}m`
          : `${m}m ${String(s).padStart(2, "0")}s`
      );
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [cutoffHourEt]);

  return left;
}

/**
 * Sticky, above the nav, and scrolling continuously at every width.
 *
 * Previously the bar dropped everything but "free shipping" on a phone, which
 * is where these claims matter most. Marqueeing means the full set stays
 * readable at 375px without truncation or wrapping.
 */
export default function AnnouncementBar() {
  const left = useCutoffCountdown();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const messages = [
    left ? `Order within ${left} to ship today` : `Orders before ${SHIP_CUTOFF} ship the same business day`,
    `Free shipping over $${SHIPPING_THRESHOLD}`,
    "Made in the USA",
    "Third-party tested, every batch",
    "COA published before you buy",
    "Shipment protection included",
  ];

  return (
    <div className="sticky top-0 z-50 bg-navy text-white">
      <div className="marquee h-10">
        <div className="marquee-mask h-full">
          <ul
            className="marquee-track h-full items-center"
            style={{
              animationDuration: "32s",
              animationPlayState: visible ? "running" : "paused",
            }}
            aria-label="Store announcements"
          >
            {[0, 1].map((copy) => (
              <li key={copy} aria-hidden={copy === 1} className="flex h-full shrink-0 items-center">
                {messages.map((m, i) => (
                  <span
                    key={m}
                    className="flex shrink-0 items-center gap-3 whitespace-nowrap pr-8 text-[13px] font-medium"
                  >
                    {i === 0 && left && (
                      <span
                        className="inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-[var(--color-teal-on-navy)]"
                        aria-hidden
                      />
                    )}
                    <span className={i === 0 && left ? "text-[var(--color-teal-on-navy)] font-semibold" : "text-white/90"}>
                      {m}
                    </span>
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
