import type { MetadataRoute } from "next";
import { products } from "@/data/products";
import { SITE } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    "",
    "/shop",
    "/formats",
    "/quality",
    "/partner",
    "/contact",
    "/about",
    "/shipping",
    "/returns",
  ].map((path) => ({
    url: `${SITE.url}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  return [
    ...staticPages,
    ...products.map((p) => ({
      url: `${SITE.url}/products/${p.slug}`,
      changeFrequency: "weekly" as const,
      priority: p.bestseller ? 0.9 : 0.6,
    })),
  ];
}
