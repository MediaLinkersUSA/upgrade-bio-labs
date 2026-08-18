import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray lockfile in the home directory makes Next infer the wrong root.
  outputFileTracingRoot: __dirname,
  images: {
    /**
     * Serve images as-is instead of through Vercel's optimizer.
     *
     * The optimizer began returning 402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED
     * once the plan's transformation quota ran out, which broke every product
     * image on the site at once while the underlying files kept serving fine.
     * That is a hard dependency on a metered service for assets that do not
     * need it: the catalogue shots are already 1200px WebP at ~30KB and the
     * hero cutouts are ~28KB WebP, all pre-sized by our own pipeline.
     *
     * next/image is still used everywhere, so width/height are still emitted
     * and there is no layout shift; only the resizing proxy is bypassed. If the
     * plan is upgraded later this can simply be deleted.
     */
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "upgradebiolabs.com" },
      { protocol: "https", hostname: "**.upgradebiolabs.com" },
    ],
  },
  experimental: { optimizePackageImports: ["framer-motion"] },
  async redirects() {
    return [
      // Product URLs moved from /products/:slug to /product/:slug. This
      // permanently forwards the old (already-indexed / bookmarked / linked)
      // URLs so they don't 404.
      {
        source: "/products/:slug",
        destination: "/product/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
