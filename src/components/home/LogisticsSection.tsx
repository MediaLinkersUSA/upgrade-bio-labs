import { SHIPPING_THRESHOLD, SHIP_CUTOFF } from "@/lib/config";
import Reveal from "@/components/ui/Reveal";

const CELLS = [
  {
    stat: "2pm",
    title: "Ships Today",
    body: `Order by ${SHIP_CUTOFF} and it leaves the same day.`,
  },
  {
    stat: `$${SHIPPING_THRESHOLD}`,
    title: "Free Shipping Over",
    body: "Your cart shows exactly how far you are from it, so there is no guessing at checkout.",
  },
  {
    stat: "$0",
    title: "Shipment Protection",
    body: "Lost, damaged, or stolen packages are reshipped at no cost. No claim form, no deductible.",
  },
];

/** Numbers do the shouting here. Three equal paragraphs of body copy read as
 *  filler; a large figure per cell gives the eye something to land on. */
export default function LogisticsSection() {
  return (
    <section className="section-pad section-round bg-wash">
      <div className="container-site">
        <ul className="grid gap-px overflow-hidden rounded-lg border border-line-soft bg-line-soft md:grid-cols-3">
          {CELLS.map((c, i) => (
            <Reveal as="li" key={c.title} delay={i * 0.06}>
              <div className="flex h-full flex-col bg-surface p-7">
                <p
                  className="font-display text-[44px] font-bold leading-none tracking-[-0.03em] text-teal-dark"
                  aria-hidden
                >
                  {c.stat}
                </p>
                <h2 className="t-title mt-3">{c.title}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
