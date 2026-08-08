"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { money } from "@/lib/pricing";
import {
  SHIPPING_THRESHOLD,
  SHIPPING_METHODS,
  shippingMethod,
  shippingCost,
  SITE,
  type ShippingMethodId,
} from "@/lib/config";
import {
  PAYMENT_METHODS,
  US_STATES,
  paymentMethod,
  type PaymentMethodId,
} from "@/lib/checkout";

/**
 * On-site checkout, mirroring the live WooCommerce page.
 *
 * Details are collected here and every method posts to the same endpoint,
 * which records the order. What differs is only where the customer goes next:
 * a card order is handed to the external payment site, a transfer order lands
 * on its payment instructions.
 */

type Field = { label: string; name: string; required?: boolean; type?: string; auto?: string };

const FIELDS: Field[][] = [
  [
    { label: "First name", name: "firstName", required: true, auto: "given-name" },
    { label: "Last name", name: "lastName", required: true, auto: "family-name" },
  ],
  [{ label: "Street address", name: "address1", required: true, auto: "address-line1" }],
  [
    {
      label: "Apartment, suite, unit, etc.",
      name: "address2",
      auto: "address-line2",
    },
  ],
  [{ label: "Town / City", name: "city", required: true, auto: "address-level2" }],
];

export default function CheckoutForm({
  /** False only when there is no database at all, in which case a transfer
   *  order has nowhere to be recorded and is hidden rather than offered and
   *  then failing at the last step. */
  offlineAvailable = true,
}: {
  offlineAvailable?: boolean;
}) {
  const cart = useCart();
  const [method, setMethod] = useState<PaymentMethodId>("card");
  const [shipId, setShipId] = useState<ShippingMethodId>("standard");
  const [values, setValues] = useState<Record<string, string>>({ state: "" });
  const [notes, setNotes] = useState("");
  const [promoDraft, setPromoDraft] = useState("");
  const [promoError, setPromoError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const methods = offlineAvailable
    ? PAYMENT_METHODS
    : PAYMENT_METHODS.filter((m) => m.instant);
  const active = paymentMethod(method);
  const ship = shippingMethod(shipId);

  // The cart's own total assumes standard ground, so shipping is recomputed
  // here against whatever the customer actually picked.
  const afterDiscount = cart.subtotal - cart.discount;
  const shippingPrice = shippingCost(ship, afterDiscount);
  // The payment-method discount comes off last, and can never drag a total
  // below zero on a small order.
  const beforeMethod = afterDiscount + shippingPrice;
  const methodDiscount = Math.min(active.discount, beforeMethod);
  const total = Math.max(0, beforeMethod - methodDiscount);

  const missing = useMemo(() => {
    const req = ["firstName", "lastName", "address1", "city", "state", "zip", "email"];
    return req.filter((k) => !(values[k] ?? "").trim());
  }, [values]);

  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));

  async function placeOrder() {
    setTouched(true);
    if (missing.length) {
      setError("Please complete the required fields above.");
      document.querySelector<HTMLElement>("[data-invalid='true']")?.focus();
      return;
    }
    setBusy(true);
    setError(null);

    const customer = { ...values, notes };
    const payload = {
      lines: cart.lines,
      promoCode: cart.promoInput,
      customer,
      paymentMethod: method,
      shippingMethod: shipId,
    };

    try {
      // One endpoint for every method: the order is always recorded here.
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setBusy(false);
        return;
      }

      if (data.paymentUrl) {
        // Off to the payment site. The cart is deliberately NOT cleared yet -
        // the customer has not paid, and someone who backs out of the payment
        // page should find their cart where they left it. /thank-you clears it
        // once they come back.
        window.location.href = data.paymentUrl;
        return;
      }

      if (data.orderNumber) {
        // A transfer: nothing more to pay online, so the cart is done.
        cart.clear();
        window.location.href = `/order/pending?ref=${encodeURIComponent(data.orderNumber)}&method=${method}`;
        return;
      }

      setError("Something went wrong. Please try again.");
      setBusy(false);
    } catch {
      setError("Could not reach the server. Please try again.");
      setBusy(false);
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="container-site py-20 text-center">
        <h1 className="t-display-md">Your Cart Is Empty</h1>
        <p className="mt-3 text-[16px] text-muted">
          Add a compound and it will show up here.
        </p>
        <Link href="/shop" className="btn-primary mt-7">
          Browse All Peptides
        </Link>
      </div>
    );
  }

  const invalid = (name: string) =>
    touched && !(values[name] ?? "").trim() ? "true" : undefined;

  const input =
    "w-full rounded-sm border bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-faint focus:border-teal focus:outline-none";
  const borderFor = (name: string) =>
    invalid(name) ? "var(--color-warn)" : "var(--color-line)";

  return (
    <div className="container-site py-10">
      <h1 className="t-display-lg">Checkout</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-start">
        {/* ------------------------------------------------ details */}
        <section aria-labelledby="details-heading">
          <h2 id="details-heading" className="t-title">
            Shipping &amp; Billing Details
          </h2>

          <div className="mt-5 space-y-4">
            {FIELDS.map((row) => (
              <div
                key={row.map((f) => f.name).join()}
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0,1fr))` }}
              >
                {row.map((f) => (
                  <div key={f.name}>
                    <label htmlFor={f.name} className="label mb-1.5 block text-muted">
                      {f.label} {f.required && <span aria-hidden>*</span>}
                    </label>
                    <input
                      id={f.name}
                      name={f.name}
                      type={f.type ?? "text"}
                      autoComplete={f.auto}
                      required={f.required}
                      aria-required={f.required}
                      data-invalid={invalid(f.name)}
                      value={values[f.name] ?? ""}
                      onChange={(e) => set(f.name, e.target.value)}
                      className={input}
                      style={{ borderColor: borderFor(f.name) }}
                    />
                  </div>
                ))}
              </div>
            ))}

            {/* Country is fixed: the store ships domestically only, so a
                one-option dropdown would be a decision with no alternatives. */}
            <div>
              <span className="label mb-1.5 block text-muted">Country / Region</span>
              <p className="rounded-sm border border-line-soft bg-surface-2 px-3.5 py-2.5 text-[15px] text-muted">
                United States <span className="text-faint">— we ship domestically only</span>
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="state" className="label mb-1.5 block text-muted">
                  State <span aria-hidden>*</span>
                </label>
                <select
                  id="state"
                  required
                  aria-required
                  data-invalid={invalid("state")}
                  value={values.state ?? ""}
                  onChange={(e) => set("state", e.target.value)}
                  className={input}
                  style={{ borderColor: borderFor("state") }}
                >
                  <option value="" disabled>
                    Select state
                  </option>
                  {US_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="zip" className="label mb-1.5 block text-muted">
                  ZIP Code <span aria-hidden>*</span>
                </label>
                <input
                  id="zip"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  required
                  aria-required
                  data-invalid={invalid("zip")}
                  value={values.zip ?? ""}
                  onChange={(e) => set("zip", e.target.value)}
                  className={input}
                  style={{ borderColor: borderFor("zip") }}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="phone" className="label mb-1.5 block text-muted">
                  Phone
                </label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  value={values.phone ?? ""}
                  onChange={(e) => set("phone", e.target.value)}
                  className={input}
                  style={{ borderColor: "var(--color-line)" }}
                />
              </div>
              <div>
                <label htmlFor="email" className="label mb-1.5 block text-muted">
                  Email address <span aria-hidden>*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-required
                  data-invalid={invalid("email")}
                  value={values.email ?? ""}
                  onChange={(e) => set("email", e.target.value)}
                  className={input}
                  style={{ borderColor: borderFor("email") }}
                />
                <p className="mt-1.5 text-[12.5px] text-faint">
                  Your receipt and tracking go here.
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="label mb-1.5 block text-muted">
                Order Notes (Optional)
              </label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={input}
                style={{ borderColor: "var(--color-line)" }}
              />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ order */}
        <section aria-labelledby="order-heading" className="lg:sticky lg:top-[100px]">
          <div className="rounded-md border border-line-soft bg-surface p-5">
            <h2 id="order-heading" className="t-title">
              Your Order
            </h2>

            <ul className="mt-4 divide-y divide-line-soft border-y border-line-soft">
              {cart.items.map((i) => (
                <li key={i.key} className="flex gap-3 py-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-surface-2">
                    <Image
                      src={i.product.image}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-contain p-1"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold leading-tight">
                      {i.product.name}
                      {i.size ? ` — ${i.size}` : ""}
                    </p>
                    <p className="data mt-0.5 text-faint">
                      {money(i.unit)} × {i.qty}
                    </p>
                  </div>
                  <p className="data shrink-0 text-[14px]">{money(i.total)}</p>
                </li>
              ))}
            </ul>

            {/* Coupon. Same field as the cart drawer, repeated here because
                this is where people look for it at the last step. */}
            {cart.promo ? (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-sm border border-teal/40 bg-wash px-3.5 py-2.5">
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
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <label htmlFor="coupon" className="sr-only">
                  Discount code
                </label>
                <input
                  id="coupon"
                  value={promoDraft}
                  onChange={(e) => {
                    setPromoDraft(e.target.value);
                    setPromoError(false);
                  }}
                  placeholder="Discount code"
                  autoComplete="off"
                  className={`${input} uppercase placeholder:normal-case`}
                  style={{ borderColor: promoError ? "var(--color-warn)" : "var(--color-line)" }}
                />
                <button
                  type="button"
                  disabled={!promoDraft.trim()}
                  onClick={async () => {
                    const res = await cart.applyPromo(promoDraft);
                    setPromoError(!res.ok);
                    if (res.ok) setPromoDraft("");
                  }}
                  className="btn-ghost shrink-0 px-4 py-2.5 text-[14px] disabled:opacity-40"
                >
                  Apply
                </button>
                {promoError && cart.promoError && (
                  <p role="alert" className="w-full text-[12.5px] leading-snug text-warn">
                    {cart.promoError}
                  </p>
                )}
              </div>
            )}

            <dl className="mt-4 space-y-1.5 font-mono text-[14px]">
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
                <dt className="text-muted">{ship.label}</dt>
                <dd>{shippingPrice === 0 ? "Free" : money(shippingPrice)}</dd>
              </div>
              {methodDiscount > 0 && (
                <div className="flex justify-between text-teal-dark">
                  <dt>{active.id === "zelle" ? "Zelle" : "CashApp"} Discount</dt>
                  <dd>−{money(methodDiscount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-line-soft pt-2 text-[16px] font-semibold">
                <dt>Total</dt>
                <dd>{money(total)}</dd>
              </div>
            </dl>

            {ship.freeOverThreshold && shippingPrice > 0 && (
              <p className="mt-2 text-[12.5px] text-faint">
                Free standard ground on orders over {money(SHIPPING_THRESHOLD)}.
              </p>
            )}

            {/* -------------------------------------- shipping method */}
            <h3 className="t-title mt-6">Shipping Method</h3>
            <div role="radiogroup" aria-label="Shipping method" className="mt-3 space-y-2">
              {SHIPPING_METHODS.map((m) => {
                const on = m.id === shipId;
                const cost = shippingCost(m, afterDiscount);
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setShipId(m.id)}
                    className="flex w-full items-center gap-3 rounded-sm px-3.5 py-3 text-left transition-colors"
                    style={{
                      border: on
                        ? "2px solid var(--color-teal)"
                        : "1px solid var(--color-line)",
                      background: on ? "var(--color-wash)" : "var(--color-surface)",
                    }}
                  >
                    <span
                      aria-hidden
                      className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2"
                      style={{ borderColor: on ? "var(--color-teal)" : "var(--color-line)" }}
                    >
                      {on && <span className="block h-[9px] w-[9px] rounded-full bg-teal" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-medium">{m.label}</span>
                      {/* The delivery window sits under the name: it is the
                          thing being bought, not the carrier's brand. */}
                      <span className="block text-[13px] text-muted">{m.eta}</span>
                    </span>
                    <span className="data shrink-0 text-[14px] font-semibold">
                      {cost === 0 ? "Free" : money(cost)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* -------------------------------------- payment method */}
            <h3 className="t-title mt-6">Payment Method</h3>
            <div role="radiogroup" aria-label="Payment method" className="mt-3 space-y-2">
              {methods.map((m) => {
                const on = m.id === method;
                return (
                  <div key={m.id}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setMethod(m.id)}
                      className="flex w-full items-center gap-3 rounded-sm px-3.5 py-3 text-left transition-colors"
                      style={{
                        border: on
                          ? "2px solid var(--color-teal)"
                          : "1px solid var(--color-line)",
                        background: on ? "var(--color-wash)" : "var(--color-surface)",
                      }}
                    >
                      <span
                        aria-hidden
                        className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2"
                        style={{
                          borderColor: on ? "var(--color-teal)" : "var(--color-line)",
                        }}
                      >
                        {on && (
                          <span className="block h-[9px] w-[9px] rounded-full bg-teal" />
                        )}
                      </span>
                      <span className="text-[14.5px] font-medium">{m.label}</span>
                    </button>
                    {on && (
                      <p className="mt-1.5 px-1 text-[13px] leading-relaxed text-muted">
                        {m.description}
                        {!m.instant && (
                          <>
                            {" "}
                            Your order number is shown as soon as you place the
                            order, and we ship once payment clears.
                          </>
                        )}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {error && (
              <p role="alert" className="mt-4 text-[13.5px] font-medium text-warn">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={placeOrder}
              disabled={busy}
              className="btn-primary mt-5 w-full"
            >
              {busy ? "Placing Order..." : `Place Order · ${money(total)}`}
            </button>

            <p className="mt-3 text-center text-[12px] text-faint">
              Your payment information is secure. SSL encryption protects your data.
            </p>
            <p className="mt-2 text-center text-[12px] text-faint">
              Research use only. Not for human or veterinary consumption. Questions?{" "}
              <a href={`mailto:${SITE.email}`} className="text-teal-dark hover:underline">
                {SITE.email}
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
