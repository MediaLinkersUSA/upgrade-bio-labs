import Link from "next/link";
import { aggregate, hasReviewCorpus } from "@/data/reviews";
import TrustMarquee from "./TrustMarquee";
import HeroScene from "./HeroScene";

const TRUST = [
  { label: "same-day dispatch", icon: "ship" },
  { label: "made in the USA", icon: "flag" },
  { label: "third-party tested", icon: "check" },
  { label: "batch-traceable COAs", icon: "doc" },
  { label: "≥99% purity", icon: "check" },
  { label: "identity, purity, quantity tested", icon: "check" },
  { label: "shipment protection included", icon: "ship" },
  { label: "COA published before you buy", icon: "doc" },
] as const;

/**
 * Full-bleed immersive hero. The product scene is the background rather than a
 * card beside the copy, which is what gives the reference build its impact.
 * Pure CSS entrance, so the first screen ships no JavaScript.
 */
export default function Hero() {
  const agg = hasReviewCorpus() ? aggregate() : null;
  const rise = (i: number) => ({ animationDelay: `${i * 70}ms` });

  return (
    <section className="relative">
      <div className="fade-to-paper relative isolate overflow-hidden">
        <HeroScene />
        {/* Legibility scrim, concentrated behind the copy column rather than
            spread flat across the stage. A uniform veil strong enough to
            protect the headline also drained the product photography to a
            ghost; this keeps the guaranteed contrast where the text actually
            sits and lets the vials hold their color at the edges. */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(58% 62% at 50% 46%, rgba(242,248,250,0.95) 0%, rgba(242,248,250,0.86) 45%, rgba(242,248,250,0.30) 78%, rgba(242,248,250,0) 100%)",
          }}
          aria-hidden
        />

        <div className="container-site flex min-h-[clamp(480px,64vh,660px)] flex-col items-center justify-center py-20 text-center">
          {/* The third item is dropped on small screens: at 375px the full
              string wraps mid-separator, which reads as a broken line. It is
              repeated in the trust bar below regardless. */}
          <p className="label hero-rise text-teal-dark" style={rise(0)}>
            US-sourced · third-party tested
            <span className="hidden sm:inline"> · batch-traceable</span>
          </p>

          <h1
            className="t-display-xl hero-rise mt-5 max-w-[18ch] text-balance"
            style={rise(1)}
          >
            99% pure peptides, with the receipts attached.
          </h1>

          <p
            // Solid ink, not an alpha tint: over a photograph the composited
            // color dropped below AA.
            className="hero-rise mt-5 max-w-[52ch] text-[17px] leading-relaxed text-ink sm:text-[19px]"
            style={rise(2)}
          >
            Every batch tested for identity, purity, and quantity by an
            independent lab. The COA is published before you buy
          </p>

          <div
            className="hero-rise mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row"
            style={rise(3)}
          >
            <Link href="/shop" className="btn-primary w-full sm:w-auto">
              Shop All Peptides <span aria-hidden>&rarr;</span>
            </Link>
            <Link href="/quality#coas" className="btn-ghost w-full sm:w-auto">
              Browse COA Library
            </Link>
          </div>

          {agg && (
            <p
              className="hero-rise mt-6 flex flex-wrap items-center justify-center gap-2 text-[15px]"
              style={rise(4)}
            >
              <span className="text-star" aria-hidden>
                {"★".repeat(Math.round(agg.average))}
              </span>
              <span className="text-muted">
                <span className="font-semibold text-ink">{agg.average}</span> from{" "}
                {agg.count.toLocaleString()} verified researchers
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Floating trust bar, overlapping the hero edge. Scrolls forever so the
          full claim set is readable at any width without wrapping, which is
          what the four-column grid could not do on a phone. */}
      <div className="container-site relative z-10 -mt-9">
        <TrustMarquee items={TRUST} />
      </div>
    </section>
  );
}
