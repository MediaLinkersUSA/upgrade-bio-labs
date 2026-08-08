"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Infinite trust marquee.
 *
 * The animation is gated on visibility rather than left running forever. An
 * always-on compositor animation keeps the main thread from ever going idle,
 * which burns battery while the bar is scrolled far off screen and made the
 * page impossible to profile. Pauses off-screen, on a hidden tab, on hover,
 * and on focus.
 */
export default function TrustMarquee({
  items,
}: {
  items: readonly { label: string; icon: string }[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      rootMargin: "120px 0px",
    });
    io.observe(el);

    const onVis = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="marquee rounded-full border border-line-soft bg-surface py-3.5 shadow-lift"
    >
      <div className="marquee-mask">
        <ul
          className="marquee-track"
          aria-label="Why researchers order from us"
          style={{ animationPlayState: inView && pageVisible ? "running" : "paused" }}
        >
          {[0, 1].map((copy) => (
            <li key={copy} aria-hidden={copy === 1} className="flex shrink-0">
              {items.map((t) => (
                <span
                  key={t.label}
                  className="flex shrink-0 items-center gap-2.5 pl-1 pr-8 text-[14px] font-medium text-ink"
                >
                  <span className="shrink-0 text-teal-dark">
                    <TrustIcon name={t.icon} />
                  </span>
                  <span className="whitespace-nowrap">{t.label}</span>
                </span>
              ))}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TrustIcon({ name }: { name: string }) {
  const p = {
    width: 15,
    height: 15,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "ship")
    return (
      <svg {...p}>
        <path d="M2 4.6h7v6.2H2z" />
        <path d="M9 6.8h3l2 2.2v1.8H9z" />
        <circle cx="4.6" cy="12.4" r="1.3" />
        <circle cx="11.4" cy="12.4" r="1.3" />
      </svg>
    );
  if (name === "flag")
    return (
      <svg {...p}>
        <path d="M3.6 14V2.6" />
        <path d="M3.6 3.2h8.8l-1.6 2.6 1.6 2.6H3.6" />
      </svg>
    );
  if (name === "doc")
    return (
      <svg {...p}>
        <path d="M4 2.4h5l3 3v8.2H4z" />
        <path d="M9 2.4v3.2h3" />
        <path d="M6 9h4M6 11.2h4" />
      </svg>
    );
  return (
    <svg {...p}>
      <circle cx="8" cy="8" r="6" />
      <path d="M5.4 8.2l1.9 1.9L10.8 6.6" />
    </svg>
  );
}
