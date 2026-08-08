import Image from "next/image";

/**
 * The hero backdrop: real catalog photography drifting over a brand gradient.
 *
 * This replaces a flat rendered image in which every vial carried the same
 * KLOW label. Each piece is the actual product shot, so the labels are
 * photographic rather than regenerated, and the mix covers all three formats.
 *
 * The alpha comes from a trained matting model rather than a threshold - see
 * scripts/install-hero-cutouts.ts for why nothing simpler works on white
 * glass photographed on white paper. The pixels are still the client's own
 * catalog photography, so the labels are exactly as shot.
 *
 * The gradient is CSS, so first paint needs no network round trip.
 */

type Piece = {
  slug: string;
  /** Percent of the stage, from the left and top edges. */
  x: number;
  y: number;
  /** Card edge as a percentage of stage height. Cards are square. */
  size: number;
  rot: number;
  /** Depth cue: further cards are smaller, paler and softer. */
  opacity: number;
  blur?: number;
  /** Seconds. Coprime-ish values keep the cards from drifting in sync. */
  drift: number;
  delay: number;
  /**
   * Phone placement. A 375px stage has almost no margin beside the copy, so
   * phone cards move into the top and bottom bands and shrink. Omitting this
   * hides the card below `sm`.
   */
  phone?: { x: number; y: number; size: number };
};

const PIECES: Piece[] = [
  // foreground, one either side of the copy column
  { slug: "bpc-157", x: 4, y: 26, size: 46, rot: -8, opacity: 1, drift: 17, delay: 0, phone: { x: -17, y: -9, size: 27 } },
  { slug: "klow-blendbpc-157-tb-500-kpv-ghk-cu", x: 79, y: 30, size: 48, rot: 7, opacity: 1, drift: 19, delay: 1.5, phone: { x: 78, y: 70, size: 28 } },

  // mid depth - the spray and the capsule, so all three formats are present
  { slug: "semax-spray", x: 22, y: -8, size: 30, rot: 12, opacity: 0.92, drift: 21, delay: 0.6, phone: { x: 76, y: -8, size: 23 } },
  { slug: "bpc-157-capsules", x: 66, y: 70, size: 30, rot: -11, opacity: 0.92, drift: 23, delay: 2.2, phone: { x: -13, y: 73, size: 24 } },

  // far depth
  { slug: "tb-500", x: 46, y: 78, size: 24, rot: 6, opacity: 0.6, blur: 1.2, drift: 18, delay: 3.1 },
  { slug: "ghk-cu-spray", x: 90, y: 76, size: 22, rot: -6, opacity: 0.55, blur: 1.4, drift: 25, delay: 1.1 },
  { slug: "glow-blendbpc-157-tb-500-ghk-cu", x: -2, y: -6, size: 22, rot: 14, opacity: 0.5, blur: 1.8, drift: 27, delay: 2.7 },
  { slug: "mots-c", x: 60, y: -14, size: 20, rot: -13, opacity: 0.45, blur: 2, drift: 24, delay: 0.3 },
  { slug: "kpv-capsules", x: 12, y: 74, size: 19, rot: 10, opacity: 0.4, blur: 2.2, drift: 29, delay: 3.6 },
];

export default function HeroScene() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* Brand gradient, matching the artwork this replaced. */}
      <div className="hero-scene-wash absolute inset-0" />

      {PIECES.map((p) => (
        <div
          key={p.slug}
          className={`hero-float absolute ${p.phone ? "" : "hidden sm:block"}`}
          style={
            {
              opacity: p.opacity,
              filter: p.blur ? `blur(${p.blur}px)` : undefined,
              animationDuration: `${p.drift}s`,
              animationDelay: `-${p.delay}s`,
              // Position travels as custom properties so one media query in
              // globals.css can swap the whole scene to its phone layout. The
              // rotation lives here too, so the float keyframes can add to it
              // rather than clobbering the resting angle.
              "--rot": `${p.rot}deg`,
              "--x": `${p.x}%`,
              "--y": `${p.y}%`,
              "--h": `${p.size}%`,
              "--mx": `${p.phone?.x ?? p.x}%`,
              "--my": `${p.phone?.y ?? p.y}%`,
              "--mh": `${p.phone?.size ?? p.size}%`,
            } as React.CSSProperties
          }
        >
          <Image
            src={`/hero/${p.slug}.webp`}
            alt=""
            width={440}
            height={620}
            sizes="(max-width: 640px) 30vw, 22vw"
            className="h-full w-auto"
            // Decorative and behind the copy: never the LCP candidate, so it
            // must not compete with the headline for early bandwidth.
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}
