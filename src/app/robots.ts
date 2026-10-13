import type { MetadataRoute } from "next";
import { SITE } from "@/lib/config";

/**
 * Indexing is allowed on the production deployment only.
 *
 * Vercel preview deployments (*.vercel.app) are duplicates of the live site,
 * and letting search engines index them would put the staging copy in
 * competition with the client's own storefront. Every non-production
 * deployment is disallowed outright.
 *
 * Production is detected with VERCEL_ENV, NOT by comparing VERCEL_URL to the
 * domain: VERCEL_URL is always the deployment's own *.vercel.app address, even
 * on production, so a host comparison always fails and blocks the live site.
 * NEXT_PUBLIC_SITE_HOST is still honoured as an explicit override.
 */
export default function robots(): MetadataRoute.Robots {
  const isProduction =
    process.env.VERCEL_ENV === "production" ||
    (process.env.NEXT_PUBLIC_SITE_HOST ?? "").replace(/^https?:\/\//, "").endsWith(SITE.domain);

  if (!isProduction) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Transactional and account pages
          "/cart",
          "/checkout",
          "/my-account",
          "/account/",
          "/forgot-password",
          "/reset-password",
          "/register",
          "/wishlist",
          "/track-order",
          "/affiliate-account",
          "/kyc-verification-dashboard",
          // Order confirmations, admin, and API routes
          "/order/",
          "/thank-you",
          "/admin",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
