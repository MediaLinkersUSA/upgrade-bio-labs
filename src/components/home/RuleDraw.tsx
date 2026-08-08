"use client";

import { useEffect, useRef, useState } from "react";

/** The hairline connecting the four testing steps, drawn left to right once. */
export default function RuleDraw() {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return <span ref={ref} data-shown={shown} className="rule-draw block h-full bg-teal" />;
}
