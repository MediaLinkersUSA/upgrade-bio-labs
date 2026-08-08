"use client";

import { useEffect } from "react";
import { useCart } from "./CartProvider";

/**
 * Empties the cart once the order is placed.
 *
 * The wait for `mounted` is the whole point. React runs a child's effects
 * before its parent's, and this component is a descendant of CartProvider - so
 * clearing on mount fired BEFORE the provider had read localStorage, and the
 * provider's own hydration effect then restored the lines it had just wiped.
 * The cart survived checkout, and the customer was one click from ordering the
 * same thing twice.
 *
 * `mounted` flips only after that read, so clearing here always lands second.
 */
export default function ClearCartOnMount() {
  const { clear, mounted } = useCart();
  useEffect(() => {
    if (mounted) clear();
  }, [clear, mounted]);
  return null;
}
