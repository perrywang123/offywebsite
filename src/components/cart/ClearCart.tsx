"use client";

import { useEffect } from "react";
import { useCart } from "./CartProvider";

/** 成功页挂载时清空购物车（订单已由服务端 capture/webhook 落库）。 */
export function ClearCartOnSuccess() {
  const { clear } = useCart();
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
