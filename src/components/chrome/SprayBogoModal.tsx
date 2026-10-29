"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const SESSION_KEY = "ubl_spray_bogo_shown";
const AGE_KEY = "ubl_age_ok"; // set by AgeGate once the visitor confirms
const SHOW_DELAY = 900; // a beat after the age gate closes, not an instant jolt

/**
 * Nasal spray "buy one, get one free" announcement.
 *
 * Home page only, once per browser session. It waits for the researcher
 * verification gate to be confirmed first, so the two overlays never stack.
 * Closes with the X, a click on the backdrop, or Escape, same as the other
 * popups. Clicking the image goes to the sprays page.
 *
 * To retire the offer: delete the <SprayBogoModal /> line in app/layout.tsx.
 */
export default function SprayBogoModal() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (pathname !== "/") return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    // The age gate stores its flag when confirmed, so poll for it rather than
    // coupling the two components. Stops once shown or when leaving the page.
    const poll = setInterval(() => {
      let ageOk = false;
      try {
        ageOk = !!sessionStorage.getItem(AGE_KEY);
      } catch {
        ageOk = true; // private mode: the gate is skipped there too
      }
      if (!ageOk) return;
      clearInterval(poll);
      timer = setTimeout(() => {
        setShow(true);
        try {
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
          /* private mode: it just shows again next tab, harmless */
        }
      }, SHOW_DELAY);
    }, 500);

    return () => {
      clearInterval(poll);
      if (timer) clearTimeout(timer);
    };
  }, [pathname]);

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

  if (!show || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Spray BOGO event: buy one nasal spray, get one free. No code needed."
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(5,46,67,0.5)] p-4 backdrop-blur-sm"
      onClick={() => setShow(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[520px] overflow-hidden rounded-lg bg-surface shadow-pop"
      >
        <button
          type="button"
          onClick={() => setShow(false)}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full bg-surface/85 p-2 text-muted backdrop-blur-sm hover:text-ink"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden>
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>

        <Link href="/shop?format=spray" onClick={() => setShow(false)} className="block">
          <Image
            src="/promo/spray-bogo.webp"
            alt="Spray BOGO event. Buy one nasal spray, get one free. Two in your cart, one is free. No code needed. Shop the sprays."
            width={1254}
            height={1254}
            sizes="(max-width: 560px) 92vw, 520px"
            priority
            className="w-full"
          />
        </Link>
      </div>
    </div>,
    document.body
  );
}
