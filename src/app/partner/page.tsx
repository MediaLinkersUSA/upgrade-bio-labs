import type { Metadata } from "next";
import { SITE } from "@/lib/config";

export const metadata: Metadata = {
  title: "Partner with us",
  description:
    "Wholesale pricing and the Upgrade Bio Labs research community affiliate program.",
  alternates: { canonical: "/partner" },
};

const TRACKS = [
  {
    title: "Wholesale",
    body: "Volume pricing beyond the published five-unit tier, with consolidated invoicing and a named account contact.",
  },
  {
    title: "Join Our Research Community",
    body: "Our affiliate program. Share a link, your audience gets a discount, and you earn on every order it brings in.",
  },
  {
    title: "Research Collaboration",
    body: "Compound sourcing and custom synthesis inquiries for work that falls outside the standing catalog.",
  },
];

/** Commission ladder. Rates are placeholders until the client confirms them,
 *  and are the single place to change if they move. */
const TIERS = [
  { name: "Member", threshold: "First sale", rate: "10%", perk: "your audience gets 10% off" },
  { name: "Advocate", threshold: "$2,500 referred", rate: "15%", perk: "your audience gets 10% off" },
  { name: "Partner", threshold: "$10,000 referred", rate: "20%", perk: "your audience gets 15% off" },
];

export default function PartnerPage() {
  return (
    <div className="container-site py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="t-display-lg">Partner With Us</h1>
          <p className="mt-3 max-w-[58ch] text-[16px] leading-relaxed text-muted">
            Three ways to work with us beyond a standard order. Every route keeps the
            same testing standard: identity, purity and quantity on every batch, plus
            endotoxin and heavy metals on vials, documented before it ships.
          </p>
        </div>
        <a
          href="https://old.upgradebiolabs.com/research-community/"
          className="btn-primary shrink-0"
        >
          Apply or Login To Partner Program <span aria-hidden>&rarr;</span>
        </a>
      </div>

      <ul className="mt-10 grid gap-5 md:grid-cols-3">
        {TRACKS.map((t) => (
          <li key={t.title} className="card p-6">
            <h2 className="t-title">{t.title}</h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{t.body}</p>
          </li>
        ))}
      </ul>

      <section id="research-community" className="section-pad !pb-0">
        <h2 className="t-display-md">Join Our Research Community</h2>
        <p className="mt-3 max-w-[62ch] text-[16px] leading-relaxed text-muted">
          Commission rises as referred volume does, and it is calculated on paid,
          non-refunded orders. Your audience always gets a discount, so the link
          is worth sharing on its own merits rather than on your goodwill.
        </p>

        <ul className="mt-7 grid gap-4 md:grid-cols-3">
          {TIERS.map((t, i) => (
            <li
              key={t.name}
              className="card flex flex-col p-6"
              style={i === 2 ? { borderColor: "var(--color-teal)" } : undefined}
            >
              <p className="label text-teal-dark">{t.name}</p>
              <p className="t-display-md mt-2">{t.rate}</p>
              <p className="mt-1 text-[13.5px] text-muted">Commission</p>
              <dl className="mt-4 space-y-2 border-t border-line-soft pt-4 text-[14px]">
                <div>
                  <dt className="text-muted">Unlocks At</dt>
                  <dd className="font-semibold">{t.threshold}</dd>
                </div>
                <div>
                  <dt className="text-muted">Their Discount</dt>
                  <dd className="font-semibold">{t.perk}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>

        <p className="mt-5 max-w-[62ch] text-[13.5px] leading-relaxed text-faint">
          Onboarding collects a signed W-9 and payout details before the first
          commission is released. Payouts run monthly on a 30-day hold, which
          covers the returns window.
        </p>

        <div className="mt-8">
          <a href="https://old.upgradebiolabs.com/research-community/" className="btn-primary">
            Apply or Login To Partner Program <span aria-hidden>&rarr;</span>
          </a>
          <p className="mt-3 text-[14px] text-muted">
            Or email{" "}
            <a href={`mailto:${SITE.email}`} className="text-teal-dark hover:underline">
              {SITE.email}
            </a>{" "}
            with your audience and where you publish.
          </p>
        </div>
      </section>
    </div>
  );
}
