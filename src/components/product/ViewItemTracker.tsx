"use client";

import { useEffect } from "react";
import { trackEcommerce } from "@/lib/analytics";
import { SITE, GOAL_META } from "@/lib/config";
import type { Product } from "@/data/types";

/**
 * Renders nothing - just fires view_item once when a product page mounts.
 * Takes the already-priced product (live/cached price, not the static
 * fallback) as a prop, so this always reports what the shopper actually saw.
 */
export default function ViewItemTracker({ product }: { product: Product }) {
  useEffect(() => {
    const goal = product.goals[0];
    trackEcommerce("view_item", {
      currency: "USD",
      value: product.basePrice,
      items: [
        {
          item_id: product.slug,
          item_name: product.name,
          price: product.basePrice,
          item_brand: SITE.name,
          item_category: goal ? GOAL_META[goal]?.title : product.format,
        },
      ],
    });
    // Only re-fire if the shopper somehow lands on a different product
    // without a full navigation (shouldn't normally happen, but slug is the
    // correct dependency either way - price changes alone shouldn't refire).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.slug]);

  return null;
}
