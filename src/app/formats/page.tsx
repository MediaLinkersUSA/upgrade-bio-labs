import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { byFormat, getProduct } from "@/data/products";
import { FORMAT_META } from "@/lib/config";
import FormatIcon from "@/components/ui/FormatIcon";
import type { Format } from "@/data/types";

export const metadata: Metadata = {
  title: "Vials, sprays, and capsules",
  description:
    "The same compounds in three formats. Lyophilized vials for the widest selection and lowest cost per mg, sprays for measured actuation, capsules for pre-dosed oral handling.",
  alternates: { canonical: "/formats" },
};

const ORDER: Format[] = ["vial", "spray", "capsule", "supply"];

const DETAIL: Record<string, { needs: string; handling: string }> = {
  vial: {
    needs: "Bacteriostatic water, a syringe, and cold storage after reconstitution.",
    handling: "Stable at room temperature while sealed and lyophilized. Refrigerate once reconstituted.",
  },
  spray: {
    needs: "Nothing. Arrives pre-mixed with a measured actuation.",
    handling: "Stable at room temperature. Best used within 30 days of first use. No reconstitution, no needles, no BAC water.",
  },
  capsule: {
    needs: "Nothing. Pre-dosed oral format.",
    handling: "Room temperature. The simplest format to store.",
  },
  supply: {
    needs: "Pairs with any lyophilized vial.",
    handling: "Benzyl-alcohol preserved, so a multi-dose vial tolerates repeated withdrawals.",
  },
};

const SHOT: Record<string, string> = {
  vial: "bpc-157",
  spray: "semax-spray",
  capsule: "bpc-157-capsules",
  supply: "bac-water-hospira-brand",
};

export default function FormatsPage() {
  return (
    <div className="container-site py-12">
      <h1 className="t-display-lg">Three Formats, One Catalog</h1>
      <p className="mt-3 max-w-[62ch] text-[16px] leading-relaxed text-muted">
        The same compounds, presented three ways. The difference is handling, not
        quality: every format is filled from the same tested material.
      </p>

      <div className="mt-10 space-y-6">
        {ORDER.map((f) => {
          const meta = FORMAT_META[f];
          const list = byFormat(f);
          const shot = getProduct(SHOT[f]);
          return (
            <section
              key={f}
              className="grid items-center gap-8 rounded-lg p-7 md:grid-cols-[1fr_220px]"
              style={{ background: meta.wash }}
            >
              <div>
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-surface"
                  style={{ color: meta.color }}
                >
                  <FormatIcon format={f} size={20} />
                </span>
                <h2 className="t-display-md mt-4" style={{ color: meta.color }}>
                  {meta.title}
                </h2>
                <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed text-muted">
                  {meta.sub}
                </p>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="label text-muted">What You Also Need</dt>
                    <dd className="mt-1 text-[14px] text-ink">{DETAIL[f].needs}</dd>
                  </div>
                  <div>
                    <dt className="label text-muted">Handling</dt>
                    <dd className="mt-1 text-[14px] text-ink">{DETAIL[f].handling}</dd>
                  </div>
                </dl>
                <Link
                  href={`/shop?format=${f}`}
                  className="mt-5 inline-block font-semibold"
                  style={{ color: meta.color }}
                >
                  {list.length} products <span aria-hidden>&rarr;</span>
                </Link>
              </div>
              {shot && (
                <div className="relative mx-auto aspect-square w-[180px]">
                  <Image src={shot.image} alt="" fill sizes="180px" className="object-contain mix-blend-multiply" />
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
