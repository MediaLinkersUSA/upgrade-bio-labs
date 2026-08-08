import type { MetadataRoute } from "next";
import { SITE } from "@/lib/config";

/**
 * Indexing is allowed on the real domain only.
 *
 * This build is a full replica of the live brand. A public preview on a
 * *.vercel.app host is a duplicate of upgradebiolabs.com, and letting search
 * engines index it would put the staging copy in competition with the client's
 * own storefront for their own terms. Every non-production host is disallowed
 * outright until the domain is cut over.
 */
export default function robots(): MetadataRoute.Robots {
  const host =
    process.env.NEXT_PUBLIC_SITE_HOST ??
    (process.env.VERCEL_ENV === "production" ? process.env.VERCEL_URL : undefined);

  const isRealDomain =
    host !== undefined && host.replace(/^https?:\/\//, "").endsWith(SITE.domain);

  if (!isRealDomain) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/account", "/order/"] },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
