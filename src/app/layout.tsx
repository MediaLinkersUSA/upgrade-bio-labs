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
const ExitIntent = dynamic(() => import("@/components/chrome/ExitIntent"));

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
        {/* Server-side GTM via Stape, per bhs.upgradebiolabs.com (see the
            CNAME added Sept 2026: bhs.upgradebiolabs.com -> usd.stape.io).
            Placed first in <head>, ahead of the redesign-ack script, since
            that's what Google's own setup instructions specify - "as high
            in the head as possible." */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://bhs.upgradebiolabs.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-P52QJ8W4');`,
          }}
        />
        {/* BlackHat Strategy dynamic optimization tag - separate from the
            GTM/Stape setup above, added at the agency's request.
            nowprocket/nitro-exclude aren't real React/HTML prop names
            TypeScript knows about (they're cache-exclusion markers some
            WordPress caching plugins look for by exact attribute name -
            irrelevant on this Next.js site, but kept as-is rather than
            second-guess the agency's snippet). Spread through a loosely
            typed object instead of passing them as normal JSX props, or
            TypeScript fails the build over two attribute names it doesn't
            recognize. */}
        <script
          {...({ nowprocket: "", "nitro-exclude": "" } as Record<string, string>)}
          type="text/javascript"
          id="sa-dynamic-optimization"
          data-uuid="8e8f072a-ca8f-4e3a-9a3e-610a0da55695"
          src="https://dashboard.blackhatstrategy.com/scripts/dynamic_optimization.js"
        />
        {/* Must run before paint: it decides whether the redesign notice is
            visible, and deciding that after hydration shifts the page. */}
        <script dangerouslySetInnerHTML={{ __html: redesignAckScript }} />
      </head>
      <body>
        {/* Google's own instructions: immediately after the opening <body>
            tag, ahead of everything else that follows. */}
        <noscript>
          <iframe
            src="https://bhs.upgradebiolabs.com/ns.html?id=GTM-P52QJ8W4"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
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
          <ExitIntent />
        </CartProvider>
      </body>
    </html>
  );
}
