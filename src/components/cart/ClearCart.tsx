"use client";

import { useEffect } from "react";
import { useCart } from "./CartProvider";
import { preserveBagOnShopifyReturn } from "@/lib/checkout-intent";

/** Bag cleanup policy; a hosted return by itself is not proof of payment. */
export function ClearCartOnSuccess({
  shopifyReturn = false,
  source,
}: { shopifyReturn?: boolean; source?: string } = {}) {
  const { clear } = useCart();
  useEffect(() => {
    if (shopifyReturn && preserveBagOnShopifyReturn(source)) return;
    clear();
  }, [clear, shopifyReturn, source]);
  return null;
}
