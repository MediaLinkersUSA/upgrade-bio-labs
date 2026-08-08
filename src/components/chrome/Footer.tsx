import Link from "next/link";
import { SITE } from "@/lib/config";
import Logo from "./Logo";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      ["All Peptides", "/shop"],
      ["Bestsellers", "/shop?sort=bestselling"],
      ["By Goal", "/shop"],
      ["Build A Stack", "/#build-your-stack"],
    ],
  },
  {
    title: "Formats",
    links: [
      ["Vials", "/shop?format=vial"],
      ["Sprays", "/shop?format=spray"],
      ["Capsules", "/shop?format=capsule"],
      ["Supplies", "/shop?format=supply"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About Us", "/about"],
      ["Quality", "/quality"],
      ["Testing", "/quality#testing"],
      ["COA Library", "/quality#coas"],
    ],
  },
  {
    title: "Support",
    links: [
      ["FAQ", "/#faq"],
      ["Contact", "/contact"],
      ["Shipping", "/shipping"],
      ["Returns", "/returns"],
    ],
  },
] as const;

export default function Footer() {
  return (
    <footer className="bg-navy text-white">
      <div className="container-site py-14">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2.8fr]">
          <div>
            <Logo light />
            <p className="mt-3 max-w-[34ch] text-[14px] text-white/70">
              US-sourced research peptides. Every batch third-party tested, every
              COA published before you buy.
            </p>
          </div>

          {/* Two columns on a phone rather than four stacked blocks, which
              turned the footer into a very long scroll on its own. */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h2 className="label mb-3 text-white/70">{col.title}</h2>
                <ul className="space-y-2.5">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="inline-block py-0.5 text-[14px] text-white/85 hover:text-white"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 border-t border-white/15 pt-6">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-white/85">
            <a href={`tel:${SITE.phone.replace(/\D/g, "")}`} className="hover:text-white">
              {SITE.phone}
            </a>
            <a href={`mailto:${SITE.email}`} className="hover:text-white">
              {SITE.email}
            </a>
          </div>
          <p className="mt-4 max-w-[92ch] text-[12.5px] leading-relaxed text-white/60">
            All products sold by {SITE.name} are intended strictly for laboratory
            research use only. They are not drugs, foods, cosmetics, or medical
            devices, and must not be misbranded, misused, or mislabeled as such.
            Products are not for human or veterinary consumption, and are not to be
            administered to humans or animals under any circumstance. These
            statements have not been evaluated by the Food and Drug Administration.
            These products are not intended to diagnose, treat, cure, or prevent any
            disease. By purchasing, you confirm you are a qualified researcher aged
            21 or older and accept full responsibility for safe handling and lawful
            use.
          </p>
          <p className="mt-4 text-[12.5px] text-white/70">
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
