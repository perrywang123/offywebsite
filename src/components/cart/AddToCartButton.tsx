"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useCart } from "./CartProvider";

export function AddToCartButton({ code, className = "" }: { code: string; className?: string }) {
  const [added, setAdded] = useState(false);
  const locale = useLocale();
  const { add } = useCart();

  function handleClick() {
    add(code, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-medium transition-colors duration-200 ${
        added ? "bg-leaf text-cream" : "bg-accent text-cream hover:bg-accent-deep"
      } ${className}`}
    >
      {added ? (locale === "zh" ? "已加入 ✓" : "Added ✓") : locale === "zh" ? "加入购物袋" : "Add to Bag"}
    </button>
  );
}
