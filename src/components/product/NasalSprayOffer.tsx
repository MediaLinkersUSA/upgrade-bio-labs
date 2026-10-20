import Link from "next/link";
import { SPRAY_OFFER } from "@/lib/totals";

/** Promo strip shown at the top of every nasal spray product page. */
export default function NasalSprayOffer() {
  return (
    <div className="mb-6 rounded-sm border border-line-soft bg-wash px-4 py-3.5">
      <p className="text-[15px] font-semibold text-teal-dark">{SPRAY_OFFER.title}</p>
      <p className="mt-0.5 text-[13.5px] text-muted">
        {SPRAY_OFFER.detail}{" "}
        <Link href={SPRAY_OFFER.href} className="font-semibold text-teal-dark underline underline-offset-2">
          Shop all nasal sprays &rarr;
        </Link>
      </p>
    </div>
  );
}
