"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scroll reveal on IntersectionObserver plus a CSS transition.
 *
 * Deliberately not Framer Motion: this runs on nearly every homepage section,
 * and pulling the animation library into the first-load bundle for a 16px fade
 * costs more than the effect is worth. Framer Motion is reserved for
 * interaction-driven UI (the cart drawer, the mobile buy bar), which is
 * dynamically imported and therefore off the critical path.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 16,
  className,
  as: As = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);

    // Fail visible. IntersectionObserver callbacks are suspended in a
    // backgrounded or throttled tab, and a reveal that never fires leaves the
    // section permanently at opacity 0. Content must never depend on an
    // animation hook running.
    const failsafe = setTimeout(() => {
      setShown(true);
      io.disconnect();
    }, 1500);

    return () => {
      clearTimeout(failsafe);
      io.disconnect();
    };
  }, []);

  return (
    <As
      ref={ref as never}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : `translateY(${y}px)`,
        transition: `opacity 500ms var(--ease-out) ${delay}s, transform 500ms var(--ease-out) ${delay}s`,
      }}
    >
      {children}
    </As>
  );
}
