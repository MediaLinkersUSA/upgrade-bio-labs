import type { Metadata } from "next";
import {
  Instrument_Sans,
  Bricolage_Grotesque,
  Playfair_Display,
  DM_Serif_Display,
  Sora,
} from "next/font/google";
import dynamic from "next/dynamic";
import "./globals.css";
import { CartProvider } from "@/components/cart/CartProvider";
import Nav from "@/components/chrome/Nav";
import Footer from "@/components/chrome/Footer";
import AnnouncementBar from "@/components/chrome/AnnouncementBar";
import RedesignNotice, { redesignAckScript } from "@/components/chrome/RedesignNotice";
import { SITE } from "@/lib/config";

// Deferred: none of these are needed for LCP. The cart drawer in particular
// owns the only Framer Motion import on the critical path, so deferring it
// keeps the animation library out of first load entirely.
const CartDrawer = dynamic(() => import("@/components/cart/CartDrawer"));
const AgeGate = dynamic(() => import("@/components/chrome/AgeGate"));

// UI face: preloaded, since almost every element above the fold uses it.
const instrument = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-instrument",
  display: "swap",
});

/* ------------------------------------------------------------------------
 * HEADLINE FONT SWITCH
 *
 * Change DISPLAY_FONT below to preview a different face on every h1/h2/h3.
 * Nothing else needs touching: --font-display in globals.css reads from it.
 *
 *   "bricolage" - current. Geometric grotesque, close to the reference build.
 *   "playfair"  - CURRENT. High-contrast display serif, the closest freely
 *                 licensable stand-in for Canela.
 *
 * If the client licenses the real Canela, drop the woff2 files into
 * src/app/fonts/ and replace the Playfair import with next/font/local:
 *
 *   const canela = localFont({
 *     src: [{ path: "./fonts/Canela-Medium.woff2", weight: "500" },
 *           { path: "./fonts/Canela-Bold.woff2",   weight: "700" }],
 *     variable: "--font-display-face", display: "swap",
 *   });
 *
 * Nothing else changes: --font-display already reads --font-display-face.
 *   "dmSerif"   - softer display serif, warmer and less editorial.
 *   "sora"      - modern geometric sans, more technical than Bricolage.
 * --------------------------------------------------------------------- */
const DISPLAY_FONT: "bricolage" | "playfair" | "dmSerif" | "sora" = "playfair";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display-face",
  display: "swap",
});
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display-face",
  display: "swap",
});
const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-display-face",
  display: "swap",
});
const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display-face",
  display: "swap",
});

const DISPLAY = { bricolage, playfair, dmSerif, sora }[DISPLAY_FONT];

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Upgrade Bio Labs - 99% Pure Research Peptides | Third-Party Tested",
    template: "%s | Upgrade Bio Labs",
  },
  description:
    "US-sourced research peptides in vials, sprays, and capsules. Every batch third-party tested for identity, purity, and quantity. Batch-level COAs published before you buy.",
  openGraph: {
    type: "website",
    siteName: SITE.name,
    url: SITE.url,
    title: "Upgrade Bio Labs - 99% Pure Research Peptides",
    description:
      "Every batch tested for identity, purity, and quantity by an independent lab. The COA is published before you buy.",
  },
  robots: { index: true, follow: true },
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE.name,
  url: SITE.url,
  logo: `${SITE.url}/logo.png`,
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: SITE.phone,
      email: SITE.email,
      contactType: "customer service",
      areaServed: "US",
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${instrument.variable} ${DISPLAY.variable}`}>
      <head>
        {/* Must run before paint: it decides whether the redesign notice is
            visible, and deciding that after hydration shifts the page. */}
        <script dangerouslySetInnerHTML={{ __html: redesignAckScript }} />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-navy focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <CartProvider>
          <AnnouncementBar />
          <Nav />
          <RedesignNotice />
          <main id="main">{children}</main>
          <Footer />
          <CartDrawer />
          <AgeGate />
        </CartProvider>
      </body>
    </html>
  );
}
