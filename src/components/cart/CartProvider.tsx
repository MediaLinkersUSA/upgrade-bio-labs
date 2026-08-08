"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getProduct } from "@/data/products";
import type { Product } from "@/data/types";
import { unitPriceAt } from "@/lib/pricing";
import { computeTotals, type Totals } from "@/lib/totals";
import { findPromo, resolveDiscount, type Promo } from "@/lib/promo";

const KEY = "ubl_cart_v1";
const PROMO_KEY = "ubl_promo_v1";

export interface Line {
  slug: string;
  qty: number;
  /** Chosen fill for multi-size SKUs, e.g. "20mg". Absent on single-size ones. */
  size?: string;
}

/** Cart identity. Two fills of the same compound are two separate lines. */
const lineKey = (slug: string, size?: string) => `${slug}::${size ?? ""}`;

interface CartValue {
  lines: Line[];
  /** false until localStorage has been read. Gate any count badge on this,
   *  otherwise the server renders 0 and the client renders N and React blanks
   *  the subtree on a hydration mismatch. */
  mounted: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (slug: string, qty?: number, size?: string) => void;
  addMany: (slugs: string[]) => void;
  setQty: (slug: string, qty: number, size?: string) => void;
  remove: (slug: string, size?: string) => void;
  clear: () => void;
  count: number;
  items: {
    product: Product;
    qty: number;
    unit: number;
    total: number;
    size?: string;
    /** Stable identity for React keys and line-level actions. */
    key: string;
  }[];
  subtotal: number;
  distinctCompounds: number;
  discountRate: number;
  discount: number;
  shipping: number;
  total: number;
  remainingForFreeShipping: number;
  /** Full breakdown from the shared calculator, including the 25% cap and the
   *  order-value reward ladder. */
  totals: Totals;

  /* ---- promotion codes ---- */
  promo: Promo | null;
  /** Whatever the customer last typed, valid or not, so the field can echo it. */
  promoInput: string;
  /** Async: the server decides, since only it can see the device cookie. */
  applyPromo: (code: string) => Promise<{ ok: boolean; message?: string }>;
  /** Why the last attempt failed, for the field to show. */
  promoError: string | null;
  clearPromo: () => void;
  /** Which discount won. Bundle and promo never sum - see lib/promo.ts. */
  discountSource: "none" | "promo" | "bundle";
  /** A valid code is entered but the bundle rate was larger, so it won. */
  promoSuperseded: boolean;
  /** The code is applied and bundle savings were given up to take it. */
  bundleSuperseded: boolean;
  /** The bundle rate that would apply with no code. Used for messaging. */
  bundleRate: number;
}

const Ctx = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Always start empty so server and first client render agree.
  const [lines, setLines] = useState<Line[]>([]);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [promoInput, setPromoInput] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Line[];
        if (Array.isArray(parsed)) {
          setLines(parsed.filter((l) => l && getProduct(l.slug) && l.qty > 0));
        }
      }
      const savedPromo = localStorage.getItem(PROMO_KEY);
      // Re-validated on read rather than trusted: a code that has since been
      // retired must not keep discounting a returning visitor's cart.
      if (savedPromo && findPromo(savedPromo)) setPromoInput(savedPromo);
    } catch {
      /* corrupt storage is not worth blocking the page for */
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* quota or private mode */
    }
  }, [lines, mounted]);

  const add = useCallback((slug: string, qty = 1, size?: string) => {
    if (!getProduct(slug)) return;
    setLines((prev) => {
      const at = prev.findIndex(
        (l) => lineKey(l.slug, l.size) === lineKey(slug, size)
      );
      if (at < 0) return [...prev, size ? { slug, qty, size } : { slug, qty }];
      const next = [...prev];
      next[at] = { ...next[at], qty: next[at].qty + qty };
      return next;
    });
    setOpen(true);
  }, []);

  const addMany = useCallback((slugs: string[]) => {
    setLines((prev) => {
      const next = [...prev];
      for (const slug of slugs) {
        if (!getProduct(slug)) continue;
        const at = next.findIndex((l) => l.slug === slug);
        if (at < 0) next.push({ slug, qty: 1 });
        else next[at] = { ...next[at], qty: next[at].qty + 1 };
      }
      return next;
    });
    setOpen(true);
  }, []);

  const setQty = useCallback((slug: string, qty: number, size?: string) => {
    const key = lineKey(slug, size);
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => lineKey(l.slug, l.size) !== key)
        : prev.map((l) => (lineKey(l.slug, l.size) === key ? { ...l, qty } : l))
    );
  }, []);

  const remove = useCallback((slug: string, size?: string) => {
    const key = lineKey(slug, size);
    setLines((prev) => prev.filter((l) => lineKey(l.slug, l.size) !== key));
  }, []);
  const clear = useCallback(() => setLines([]), []);

  const [promoError, setPromoError] = useState<string | null>(null);

  /**
   * Applies a code, asking the server first.
   *
   * The device check lives in an httpOnly cookie the browser cannot read, so
   * this cannot be decided locally - and deciding it here is the point: a
   * repeat visitor learns the code is spent while shopping, not at payment.
   */
  const applyPromo = useCallback(async (code: string) => {
    setPromoError(null);
    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!data.ok) {
        setPromoError(data.message ?? "That code is not recognized.");
        return { ok: false, message: data.message as string | undefined };
      }
      setPromoInput(data.code);
      try {
        localStorage.setItem(PROMO_KEY, data.code);
      } catch {
        /* quota or private mode */
      }
      return { ok: true };
    } catch {
      // Network failure should not strand a valid code: fall back to the local
      // catalogue, and let checkout make the binding decision.
      const found = findPromo(code);
      if (!found) {
        setPromoError("That code is not recognized.");
        return { ok: false };
      }
      setPromoInput(found.code);
      return { ok: true };
    }
  }, []);

  const clearPromo = useCallback(() => {
    setPromoInput("");
    setPromoError(null);
    try {
      localStorage.removeItem(PROMO_KEY);
    } catch {
      /* quota or private mode */
    }
  }, []);

  const value = useMemo<CartValue>(() => {
    const items = lines
      .map((l) => {
        const product = getProduct(l.slug);
        if (!product) return null;
        // Size-aware: the 20mg fill must not be priced off the 10mg ladder.
        const unit = unitPriceAt(product, l.qty, l.size);
        return {
          product,
          qty: l.qty,
          unit,
          total: unit * l.qty,
          size: l.size,
          key: lineKey(l.slug, l.size),
        };
      })
      .filter(Boolean) as CartValue["items"];

    // One shared calculator for the cart, the order route and the offline
    // order route, so the quoted price and the charged price cannot diverge -
    // and so the 25% cap is enforced in exactly one place.
    const totals = computeTotals({
      items: items.map((i) => ({ product: i.product, qty: i.qty, size: i.size })),
      promoCode: promoInput,
    });

    const bundleRate = totals.resolved.rate === 0 ? 0 : totals.resolved.rate;
    const promo = findPromo(promoInput);

    return {
      lines,
      mounted,
      open,
      setOpen,
      add,
      addMany,
      setQty,
      remove,
      clear,
      count: items.reduce((s, i) => s + i.qty, 0),
      items,
      subtotal: totals.listSubtotal,
      distinctCompounds: totals.distinctCompounds,
      discountRate: totals.discountRate,
      discount: totals.totalDiscount,
      shipping: totals.shipping,
      total: totals.total,
      remainingForFreeShipping: totals.nextReward?.threshold === undefined
        ? 0
        : Math.max(0, totals.listSubtotal - totals.totalDiscount) >= totals.nextReward.threshold
          ? 0
          : totals.nextReward.remaining,
      totals,

      promo,
      promoInput,
      applyPromo,
      clearPromo,
      promoError,
      discountSource: totals.resolved.source,
      promoSuperseded: totals.resolved.supersededPromo,
      bundleSuperseded: totals.resolved.supersededBundle,
      bundleRate: totals.resolved.source === "bundle" ? totals.resolved.rate : bundleRate,
    };
  }, [
    lines,
    mounted,
    open,
    add,
    addMany,
    setQty,
    remove,
    clear,
    promoInput,
    applyPromo,
    clearPromo,
    promoError,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside <CartProvider>");
  return c;
}
