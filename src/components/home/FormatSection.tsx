import Image from "next/image";
import Link from "next/link";
import { byFormat } from "@/data/products";
import { FORMAT_META } from "@/lib/config";
import FormatIcon from "@/components/ui/FormatIcon";
import Reveal from "@/components/ui/Reveal";
import type { Format } from "@/data/types";

const ORDER: Format[] = ["vial", "spray", "capsule"];

/** Each card leads with a real photograph of that format, shot on the format's
 *  own color. The image is the argument; the copy just names it. */
const SHOT: Record<string, { src: string; dark: boolean }> = {
  vial: { src: "/sections/format-vial.webp", dark: true },
  spray: { src: "/sections/format-spray.webp", dark: false },
  capsule: { src: "/sections/format-capsule.webp", dark: false },
};

export default function FormatSection() {
  return (
    <section id="formats" className="section-pad">
      <div className="container-site">
        <Reveal className="mb-9 max-w-[54ch]">
          <h2 className="t-display-lg">Three Formats, One Catalog</h2>
          <p className="mt-3 text-[17px] leading-relaxed text-muted">
            The same tested compounds, presented three ways. Pick the handling
            that fits your protocol.
          </p>
        </Reveal>

        <ul className="grid grid-cols-3 gap-2.5 sm:gap-4 md:gap-5">
          {ORDER.map((f, i) => {
            const meta = FORMAT_META[f];
            const shot = SHOT[f];
            const count = byFormat(f).length;
            return (
              <Reveal as="li" key={f} delay={i * 0.07}>
                <Link
                  href={`/shop?format=${f}`}
                  className="group flex h-full flex-col overflow-hidden rounded-lg border border-line-soft bg-surface shadow-card transition-all duration-[220ms] ease-[var(--ease-out)] hover:-translate-y-1 hover:shadow-lift"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={shot.src}
                      alt={`Upgrade Bio Labs ${meta.title}`}
                      fill
                      sizes="(max-width: 768px) 31vw, 380px"
                      className="object-cover transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.04]"
                    />
                    <span
                      className="label absolute left-4 top-4 hidden items-center gap-1.5 rounded-full bg-surface/95 px-3 py-2 backdrop-blur-sm sm:inline-flex"
                      style={{ color: meta.text }}
                    >
                      <FormatIcon format={f} size={13} />
                      {count} compounds
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-3 sm:p-5 md:p-6">
                    <h3 className="text-[15px] font-semibold leading-tight tracking-[-0.02em] sm:text-[20px] md:t-display-md" style={{ color: meta.text }}>
                      {meta.title}
                    </h3>
                    <p className="mt-1 text-[12px] text-muted sm:hidden">
                      {count} compounds
                    </p>
                    <p className="mt-1.5 hidden flex-1 text-[15px] leading-relaxed text-muted sm:block">
                      {meta.sub}
                    </p>
                    <span
                      className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold sm:mt-5 sm:gap-2 sm:text-[15px]"
                      style={{ color: meta.text }}
                    >
                      <span className="sm:hidden">View</span>
                      <span className="hidden sm:inline">shop {meta.label}</span>
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
