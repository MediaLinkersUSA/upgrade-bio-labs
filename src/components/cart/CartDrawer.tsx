"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCart } from "./CartProvider";
import { getProduct, compounds } from "@/data/products";
import { money } from "@/lib/pricing";
import { REWARDS } from "@/lib/totals";
import FormatChip from "@/components/ui/FormatChip";

const BUMP_SLUG = "bac-water-hospira-brand";

export default function CartDrawer() {
  const cart = useCart();
  const { open, setOpen } = cart;
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  // Lock scroll and trap focus while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return setOpen(false);
      if (e.key !== "Tab") return;
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'
      );
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  /** The bar spans zero to the highest reward, so every threshold has a spot. */
  const TOP_REWARD = REWARDS[REWARDS.length - 1].threshold;
  const spent = Math.max(0, cart.totals.subtotal - cart.totals.rateDiscount);
  const ladderPct = Math.min(100, Math.round((spent / TOP_REWARD) * 100));
  const bump = getProduct(BUMP_SLUG);
  const hasBump = cart.items.some((i) => i.product.slug === BUMP_SLUG);
  const hasVial = cart.items.some((i) => i.product.format === "vial");

  /**
   * What to suggest to close the free-shipping gap.
   *
   * Cheapest-that-fits alone produced nonsense: a BPC-157 cart was told to add
   * DSIP, a sleep peptide, purely because it happened to cost the right amount.
   * A suggestion that ignores what is already in the basket reads as random and
   * gets ignored. So the SKUs each cart item explicitly pairs with are
   * considered first, and price is only the tie-breaker within that set.
   */
  const gapFiller = (() => {
    const inCart = new Set(cart.items.map((i) => i.product.slug));
    const affordable = (p: { inStock: boolean; basePrice: number; slug: string }) =>
      p.inStock && !inCart.has(p.slug) && p.basePrice >= cart.remainingForFreeShipping;

    // Cross-sells the catalogue already declares for what is in the cart.
    const paired = cart.items
      .flatMap((i) => i.product.pairsWith ?? [])
      .map(getProduct)
      .filter((p): p is NonNullable<typeof p> => !!p && p.format !== "supply");

    const relevant = paired.filter(affordable).sort((a, b) => a.basePrice - b.basePrice)[0];
    if (relevant) return relevant;

    // Nothing paired is in range: fall back to a compound sharing a research
    // goal, which is still a reason rather than a coincidence.
    const goals = new Set(cart.items.flatMap((i) => i.product.goals));
    const sameGoal = compounds()
      .filter((p) => affordable(p) && p.goals.some((g) => goals.has(g)))
      .sort((a, b) => a.basePrice - b.basePrice)[0];
    if (sameGoal) return sameGoal;

    return compounds().filter(affordable).sort((a, b) => a.basePrice - b.basePrice)[0];
  })();

  /** The drawer no longer posts to a payment processor: details and method are
   *  collected on /checkout, which is the only place that knows whether this
   *  is a card order or a transfer. */
  function goToCheckout() {
    setBusy(true);
    setOpen(false);
    window.location.href = "/checkout";
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-[rgba(5,46,67,0.35)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Your order"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col bg-surface shadow-pop"
            initial={reduce ? { opacity: 0 } : { x: "100%" }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "100%" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="flex items-center justify-between border-b border-line-soft px-5 py-4">
              <h2 className="t-title">
                your order{" "}
                <span className="font-mono text-[14px] text-muted">({cart.count})</span>
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close cart"
                className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-ink"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            {cart.items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                <p className="t-title">Nothing here yet.</p>
                <p className="text-[15px] text-muted">
                  Every batch is third-party tested and the COA is published before you buy.
                </p>
                <Link href="/shop" onClick={() => setOpen(false)} className="btn-primary">
                  Browse All Peptides
                </Link>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto">
                  {/* 1. Reward ladder. One bar across all three thresholds
                      rather than a single free-shipping goal: the customer can
                      see the next two rewards, which is the whole point of
                      having them. */}
                  <div className="border-b border-line-soft bg-surface-2 px-5 py-4">
                    {cart.totals.nextReward ? (
                      <p className="text-[14px]">
                        You&apos;re{" "}
                        <span className="data font-semibold">
                          {money(cart.totals.nextReward.remaining)}
                        </span>{" "}
                        from {cart.totals.nextReward.label.toLowerCase()}
                      </p>
                    ) : (
                      <motion.p
                        initial={reduce ? false : { scale: 0.96 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                        className="text-[14px] font-semibold text-success"
                      >
                        All rewards unlocked ✓
                      </motion.p>
                    )}

                    <div
                      className="relative mt-3 h-2 rounded-full bg-line-soft"
                      role="progressbar"
                      aria-valuenow={ladderPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Progress toward order rewards"
                    >
                      <motion.div
                        className="h-full rounded-full bg-teal"
                        animate={{ width: `${ladderPct}%` }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      />
                      {/* Markers sit on the bar so the thresholds are legible
                          as positions, not just as a list underneath. */}
                      {REWARDS.map((r) => (
                        <span
                          key={r.id}
                          aria-hidden
                          className="absolute top-1/2 h-[10px] w-[10px] -translate-y-1/2 rounded-full border-2 border-surface-2"
                          style={{
                            left: `calc(${(r.threshold / TOP_REWARD) * 100}% - 5px)`,
                            background: cart.totals.unlocked[r.id]
                              ? "var(--color-teal)"
                              : "var(--color-line)",
                          }}
                        />
                      ))}
                    </div>

                    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                      {REWARDS.map((r) => {
                        const on = cart.totals.unlocked[r.id];
                        return (
                          <li
                            key={r.id}
                            className="flex items-center gap-1.5 text-[12.5px]"
                            style={{ color: on ? "var(--color-teal-dark)" : "var(--color-faint)" }}
                          >
                            <span aria-hidden>{on ? "✓" : "○"}</span>
                            <span className={on ? "font-semibold" : undefined}>
                              {money(r.threshold)} · {r.label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>

                    {/* Unlocked but not taken: one tap to claim it. */}
                    {cart.totals.unlocked["free-bac"] && !hasBump && bump && (
                      <button
                        type="button"
                        onClick={() => cart.add(BUMP_SLUG)}
                        className="mt-3 w-full rounded-sm border-2 border-dashed border-teal bg-wash px-3 py-2.5 text-[13.5px] font-semibold text-teal-dark"
                      >
                        + Claim your free {bump.name} &rarr;
                      </button>
                    )}

                    {cart.totals.nextReward && gapFiller && (
                      <button
                        type="button"
                        onClick={() => cart.add(gapFiller.slug)}
                        className="mt-2.5 block text-left text-[13.5px] text-teal-dark underline underline-offset-2"
                      >
                        + add {gapFiller.name} · {money(gapFiller.basePrice)} &rarr;
                      </button>
                    )}
                  </div>

                  {/* 2. Bundle ladder. Suppressed entirely while a code is
                      applied: prompting for "1 more compound to save 20%" when
                      that 20% cannot be taken on top of a 25% code would be
                      selling an upsell that does not exist. */}
                  {cart.distinctCompounds >= 1 && cart.discountSource !== "promo" && (
                    <div className="border-b border-line-soft px-5 py-3">
                      {cart.discountRate > 0 ? (
                        <p className="text-[13.5px] font-semibold text-teal-dark">
                          Bundle Discount −{Math.round(cart.discountRate * 100)}% Applied
                        </p>
                      ) : null}
                      {cart.distinctCompounds === 1 && (
                        <p className="text-[13.5px] text-muted">
                          Add 1 More Compound &rarr; Save 15%
                        </p>
                      )}
                      {cart.distinctCompounds === 2 && (
                        <p className="text-[13.5px] text-muted">
                          Add 1 More Compound &rarr; Save 20%
                        </p>
                      )}
                    </div>
                  )}

                  {/* 3. Line items */}
                  <ul className="divide-y divide-line-soft">
                    {cart.items.map(({ product, qty, unit, total, size, key }) => (
                      <li key={key} className="flex gap-3 px-5 py-4">
                        <Link
                          href={`/product/${product.slug}`}
                          onClick={() => setOpen(false)}
                          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-surface-2"
                        >
                          <Image
                            src={product.image}
                            alt=""
                            fill
                            sizes="64px"
                            className="object-contain p-1"
                          />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              href={`/product/${product.slug}`}
                              onClick={() => setOpen(false)}
                              className="text-[15px] font-semibold leading-tight hover:text-teal-dark"
                            >
                              {product.name}
                            </Link>
                            <button
                              type="button"
                              onClick={() => cart.remove(product.slug, size)}
                              aria-label={`Remove ${product.name}${size ? `, ${size}` : ""}`}
                              className="shrink-0 text-muted hover:text-ink"
                            >
                              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
                                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                              </svg>
                            </button>
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <FormatChip format={product.format} />
                            {/* Two fills of one compound are two lines, so the
                                fill has to be visible or they look identical. */}
                            {size && (
                              <span className="label rounded-full bg-surface-2 px-2 py-1 text-muted">
                                {size}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <div className="flex items-center rounded-full border border-line">
                              <button
                                type="button"
                                onClick={() => cart.setQty(product.slug, qty - 1, size)}
                                aria-label={`Decrease ${product.name} quantity`}
                                className="px-2.5 py-1 text-muted hover:text-ink"
                              >
                                −
                              </button>
                              <span className="min-w-6 text-center font-mono text-[13px]">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => cart.setQty(product.slug, qty + 1, size)}
                                aria-label={`Increase ${product.name} quantity`}
                                className="px-2.5 py-1 text-muted hover:text-ink"
                              >
                                +
                              </button>
                            </div>
                            <div className="text-right">
                              <p className="font-mono text-[14px] font-semibold">
                                {money(total)}
                              </p>
                              {qty > 1 && (
                                <p className="font-mono text-[11.5px] text-faint">
                                  {money(unit)} ea
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* 4. Order bump - exactly one */}
                  {hasVial && !hasBump && bump?.inStock && (
                    <div className="border-t border-line-soft px-5 py-4">
                      <label className="flex cursor-pointer items-center gap-3 rounded-sm border border-line bg-surface-2 p-3">
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => cart.add(BUMP_SLUG)}
                          className="h-4 w-4 accent-[var(--color-teal)]"
                        />
                        <span className="flex-1 text-[14px]">
                          + add {bump.name}
                          <span className="block text-[13px] text-muted">
                            You need this to reconstitute a lyophilized vial.
                          </span>
                        </span>
                        <span className="font-mono text-[14px]">{money(bump.basePrice)}</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* 5 + 6. Totals and checkout */}
                <footer className="border-t border-line-soft px-5 py-4">
                  <PromoField />

                  <dl className="mt-3 space-y-1.5 font-mono text-[14px]">
                    <div className="flex justify-between">
                      <dt className="text-muted">Subtotal</dt>
                      <dd>{money(cart.subtotal)}</dd>
                    </div>
                    {cart.discount > 0 && (
                      <div className="flex justify-between text-teal-dark">
                        <dt>
                          {cart.discountSource === "promo"
                            ? `${cart.promo?.code} (−${Math.round(cart.discountRate * 100)}%)`
                            : `Bundle Discount (−${Math.round(cart.discountRate * 100)}%)`}
                        </dt>
                        <dd>−{money(cart.discount)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-muted">Shipping</dt>
                      <dd>{cart.shipping === 0 ? "free" : money(cart.shipping)}</dd>
                    </div>
                    <div className="flex justify-between border-t border-line-soft pt-2 text-[16px] font-semibold">
                      <dt>Total</dt>
                      <dd>{money(cart.total)}</dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    onClick={goToCheckout}
                    disabled={busy}
                    className="btn-primary mt-4 w-full"
                  >
                    {busy ? "Loading..." : `Checkout · ${money(cart.total)}`}{" "}
                    {!busy && <span aria-hidden>&rarr;</span>}
                  </button>
                  <p className="mt-2.5 text-center text-[12px] text-faint">
                    Research use only. Not for human or veterinary consumption.
                  </p>
                </footer>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Promotion code entry.
 *
 * The messaging is the important part. A first-order code and the bundle
 * discount are mutually exclusive, so a customer who has both in play needs to
 * be told which one they got and why the other vanished - otherwise the cart
 * looks like it silently dropped a discount they had already earned.
 */
function PromoField() {
  const cart = useCart();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  if (cart.promo) {
    return (
      <div className="rounded-sm border border-teal/40 bg-wash px-3.5 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13.5px] font-semibold text-teal-dark">
            {cart.promo.code} applied · {Math.round(cart.promo.rate * 100)}% off
          </p>
          <button
            type="button"
            onClick={() => cart.clearPromo()}
            className="text-[13px] text-muted underline underline-offset-2 hover:text-ink"
          >
            Remove
          </button>
        </div>

        {cart.bundleSuperseded && (
          <p className="mt-1.5 text-[12.5px] leading-snug text-muted">
            This replaces your {Math.round(cart.bundleRate * 100)}% bundle
            discount rather than adding to it. You are getting the larger of the
            two. Quantity pricing still applies.
          </p>
        )}
        {cart.promoSuperseded && (
          <p className="mt-1.5 text-[12.5px] leading-snug text-muted">
            Your {Math.round(cart.bundleRate * 100)}% bundle discount is larger,
            so we have kept that one. The two do not combine.
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const res = await cart.applyPromo(draft);
        setBusy(false);
        setError(!res.ok);
        if (res.ok) setDraft("");
      }}
      className="flex flex-wrap gap-2"
    >
      <label htmlFor="promo" className="sr-only">
        Discount code
      </label>
      <input
        id="promo"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(false);
        }}
        placeholder="Discount code"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        aria-invalid={error || undefined}
        aria-describedby={error ? "promo-error" : undefined}
        className="min-w-0 flex-1 rounded-sm border border-line bg-surface px-3 py-2 text-[14px] uppercase text-ink placeholder:normal-case placeholder:text-faint focus:border-teal focus:outline-none"
      />
      <button
        type="submit"
        disabled={!draft.trim()}
        className="btn-ghost shrink-0 px-4 py-2 text-[14px] disabled:opacity-40"
      >
        Apply
      </button>
      {error && (
        <p id="promo-error" className="sr-only" role="alert">
          That code is not recognized.
        </p>
      )}
      {error && cart.promoError && (
        <p role="alert" className="w-full text-[12.5px] leading-snug text-warn">
          {cart.promoError}
        </p>
      )}
    </form>
  );
}
