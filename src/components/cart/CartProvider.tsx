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
import { computeTotals, discountableSubtotal, type Totals } from "@/lib/totals";
import { findPromo } from "@/lib/promo";

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

/**
 * A code the server has confirmed is good, whatever its source - the
 * built-in first-order code or a live WooCommerce coupon. The cart only
 * needs the code and the rate; where it came from is the server's business
 * (lib/promo-resolve.ts).
 */
type AppliedPromo = { code: string; rate: number; label: string; source: "local" | "woo" };

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
  promo: AppliedPromo | null;
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
  const [restorePromoCode, setRestorePromoCode] = useState<string | null>(null);

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
      // Handed off to the effect below rather than trusted here: a code that
      // has since been retired - in the local table or in WooCommerce - must
      // not keep discounting a returning visitor's cart, and checking that
      // needs a round trip to the server.
      if (savedPromo) setRestorePromoCode(savedPromo);
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
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);

  /**
   * Asks the server whether a code is good, without touching the error state
   * - that is `applyPromo`'s job. Split out so the silent restore-on-mount
   * path can share the exact same check without flashing an error at a
   * visitor who did nothing wrong.
   *
   * The device check (for the first-order code) lives in an httpOnly cookie
   * the browser cannot read, so this cannot be decided locally - and a
   * WooCommerce coupon cannot be validated locally at all, since it lives in
   * WordPress. Both go through the same round trip.
   */
  const runPromoValidation = useCallback(
    async (code: string): Promise<{ ok: boolean; message?: string }> => {
      const items = lines
        .map((l) => {
          const product = getProduct(l.slug);
          return product ? { product, qty: l.qty, size: l.size } : null;
        })
        .filter(Boolean) as { product: Product; qty: number; size?: string }[];
      const subtotalCents = Math.round(discountableSubtotal(items) * 100);

      try {
        const res = await fetch("/api/promo/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, subtotalCents }),
        });
        const data = await res.json();
        if (!data.ok) {
          return { ok: false, message: data.message as string | undefined };
        }
        setPromoInput(data.code);
        setAppliedPromo({
          code: data.code,
          rate: data.rate,
          label: data.label ?? data.code,
          source: data.source === "woo" ? "woo" : "local",
        });
        try {
          localStorage.setItem(PROMO_KEY, data.code);
        } catch {
          /* quota or private mode */
        }
        return { ok: true };
      } catch {
        // Network failure should not strand a valid code: fall back to the
        // local catalogue, and let checkout make the binding decision. A
        // WooCommerce coupon needs the network and simply cannot be
        // validated offline.
        const found = findPromo(code);
        if (!found) return { ok: false, message: "That code is not recognized." };
        setPromoInput(found.code);
        setAppliedPromo({ code: found.code, rate: found.rate, label: found.label, source: "local" });
        return { ok: true };
      }
    },
    [lines]
  );

  const applyPromo = useCallback(
    async (code: string) => {
      setPromoError(null);
      const result = await runPromoValidation(code);
      if (!result.ok) setPromoError(result.message ?? "That code is not recognized.");
      return result;
    },
    [runPromoValidation]
  );

  // Silently re-validates a code restored from localStorage once the cart's
  // own lines have been restored (runPromoValidation needs them for the
  // subtotal check). No error is surfaced here - a lapsed code should just
  // quietly stop applying, not greet a returning visitor with a warning.
  useEffect(() => {
    if (!mounted || !restorePromoCode) return;
    const code = restorePromoCode;
    setRestorePromoCode(null);
    runPromoValidation(code).then((r) => {
      if (!r.ok) {
        try {
          localStorage.removeItem(PROMO_KEY);
        } catch {
          /* quota or private mode */
        }
      }
    });
    // Runs once, right after mount finishes restoring the cart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const clearPromo = useCallback(() => {
    setPromoInput("");
    setAppliedPromo(null);
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
      promoRate: appliedPromo?.rate ?? 0,
    });

    const bundleRate = totals.resolved.rate === 0 ? 0 : totals.resolved.rate;
    const promo = appliedPromo;

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
    appliedPromo,
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
