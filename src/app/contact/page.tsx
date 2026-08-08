import type { Metadata } from "next";
import { SITE, SHIP_CUTOFF } from "@/lib/config";

export const metadata: Metadata = {
  title: "Contact",
  description: "Reach the Upgrade Bio Labs team about orders, COAs, wholesale pricing, or anything else.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="container-site py-12">
      <h1 className="t-display-lg">Contact</h1>
      <p className="mt-3 max-w-[56ch] text-[16px] leading-relaxed text-muted">
        Orders placed before {SHIP_CUTOFF} on a business day ship the same day.
        For anything else, reach us directly.
      </p>

      <dl className="mt-8 grid gap-5 sm:grid-cols-2">
        <div className="card p-6">
          <dt className="label text-muted">Phone</dt>
          <dd className="mt-2">
            <a
              href={`tel:${SITE.phone.replace(/\D/g, "")}`}
              className="t-title text-teal-dark hover:underline"
            >
              {SITE.phone}
            </a>
            <p className="mt-1 text-[14px] text-muted">Monday to Friday, 9am to 5pm EST.</p>
          </dd>
        </div>
        <div className="card p-6">
          <dt className="label text-muted">Email</dt>
          <dd className="mt-2">
            <a href={`mailto:${SITE.email}`} className="t-title text-teal-dark hover:underline">
              {SITE.email}
            </a>
            <p className="mt-1 text-[14px] text-muted">We reply within one business day.</p>
          </dd>
        </div>
      </dl>

      <section className="mt-10">
        <h2 className="t-display-md">Wholesale And Bulk</h2>
        <p className="mt-2 max-w-[56ch] text-[16px] leading-relaxed text-muted">
          Quantity pricing is built into every product page and applies
          automatically at three and five units. For volumes beyond that, email
          us with the compounds and quantities you need and we will send a quote.
        </p>
      </section>
    </div>
  );
}
