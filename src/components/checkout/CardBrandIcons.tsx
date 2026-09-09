/**
 * Card-brand chips shown next to "Pay Online with Debit/Credit Card" -
 * Visa, Mastercard, Amex, Discover, the four Stripe enables by default and
 * the four a US shopper expects to see before trusting a card form.
 *
 * Simplified marks (brand color + wordmark/symbol), not pixel-exact vector
 * reproductions of each network's logo file - this is the same level of
 * fidelity most checkout pages use, and keeps this a plain inline SVG/CSS
 * component with no external logo assets to source, license, or keep in
 * sync with anyone's brand-asset updates.
 */
export default function CardBrandIcons() {
  const chip = "flex h-6 w-9 shrink-0 items-center justify-center rounded-[3px] text-white";
  return (
    <span className="ml-auto flex items-center gap-1" aria-hidden>
      <span className={chip} style={{ background: "#1A1F71" }}>
        <span className="text-[10px] font-black italic tracking-tight">VISA</span>
      </span>
      <span className={chip} style={{ background: "#16171A" }}>
        <svg width="20" height="13" viewBox="0 0 20 13">
          <circle cx="7.2" cy="6.5" r="6.2" fill="#EB001B" />
          <circle cx="12.8" cy="6.5" r="6.2" fill="#F79E1B" fillOpacity="0.92" />
        </svg>
      </span>
      <span className={chip} style={{ background: "#006FCF" }}>
        <span className="text-[9px] font-black tracking-tight">AMEX</span>
      </span>
      <span className={chip} style={{ background: "#FF6000" }}>
        <span className="text-[7px] font-black tracking-tight">DISCOVER</span>
      </span>
    </span>
  );
}
