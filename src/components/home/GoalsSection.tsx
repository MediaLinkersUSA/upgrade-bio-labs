import Image from "next/image";
import Link from "next/link";
import { byGoal } from "@/data/products";
import { GOAL_META, GOAL_ORDER } from "@/lib/config";
import Reveal from "@/components/ui/Reveal";

/** Image-led tiles. Each shot was framed with negative space on the right, so
 *  the copy sits in clear air rather than fighting the product. */
export default function GoalsSection() {
  return (
    <section className="section-pad section-round bg-surface">
      <div className="container-site">
        <Reveal className="mb-9 max-w-[54ch]">
          <h2 className="t-display-lg">Start With The Outcome</h2>
          <p className="mt-3 text-[17px] leading-relaxed text-muted">
            Not sure which compound? Pick the research area and we will narrow
            the catalog for you.
          </p>
        </Reveal>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GOAL_ORDER.map((g, i) => {
            const meta = GOAL_META[g];
            const count = byGoal(g).length;
            return (
              <Reveal as="li" key={g} delay={i * 0.05}>
                <Link
                  href={`/shop?goal=${g}`}
                  className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-lg transition-transform duration-[220ms] ease-[var(--ease-out)] hover:-translate-y-1"
                >
                  <Image
                    src={`/sections/goal-${g}.webp`}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 380px"
                    className="object-cover transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.05]"
                  />
                  {/* Scrim so the copy stays legible across six different
                      background colors without hard-coding six text colors. */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(5,46,67,0.88) 0%, rgba(5,46,67,0.55) 38%, rgba(5,46,67,0.05) 72%)",
                    }}
                    aria-hidden
                  />
                  <div className="relative p-6">
                    <h3 className="t-title text-white">{meta.title}</h3>
                    <p className="mt-1 text-[14px] text-white/80">{meta.sub}</p>
                    <span className="label mt-3 inline-flex items-center gap-1.5 text-white/90">
                      {count} compounds
                      <span
                        aria-hidden
                        className="transition-transform duration-[220ms] ease-[var(--ease-out)] group-hover:translate-x-1"
                      >
                        &rarr;
                      </span>
                    </span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
