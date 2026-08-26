"use client";

import { useEffect, useRef, useState } from "react";
import type { LivePricing } from "./apply-live-pricing";

/**
 * Fetches live WooCommerce prices for a set of product slugs, after the
 * (statically generated) page has already rendered with the catalog's static
 * prices.
 *
 * Returns an empty map until the fetch resolves, so callers can just do
 * `applyLivePricing(product, prices[product.slug])` unconditionally - before
 * the fetch lands, that is a no-op and the static price keeps showing;
 * once it resolves, prices update in place with no layout shift, since only
 * numbers change, never structure.
 *
 * Refetches if the slug set itself changes (e.g. a shop filter swaps which
 * products are visible), not on every render - the dependency is the sorted,
 * de-duplicated slug list as a string, not the array reference.
 */
export function useLivePrices(slugs: string[]): Record<string, LivePricing> {
  const [prices, setPrices] = useState<Record<string, LivePricing>>({});
  const key = [...new Set(slugs)].sort().join(",");
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (!key || key === lastKey.current) return;
    lastKey.current = key;
    let cancelled = false;

    fetch("/api/live-price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slugs: key.split(",") }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.prices) setPrices(data.prices);
      })
      .catch(() => {
        // WordPress unreachable or slow - the static prices already on
        // screen just keep showing. Nothing to recover from here.
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return prices;
}
