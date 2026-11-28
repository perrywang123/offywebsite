"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCart } from "./CartProvider";

export function AddToCartButton({
  code,
  className = "",
  disabled = false,
  variant = "solid",
  disabledLabel = "Sold out",
  maxQuantityPerOrder,
}: {
  code: string;
  className?: string;
  disabled?: boolean;
  variant?: "solid" | "outline";
  disabledLabel?: string;
  maxQuantityPerOrder?: 1;
}) {
  const [added, setAdded] = useState(false);
  const t = useTranslations("common.actions");
  const { add, catalog, lines } = useCart();
  const limit = catalog[code]?.maxQuantityPerOrder ?? maxQuantityPerOrder;
  const atLimit =
    limit !== undefined && (lines.find((line) => line.code === code)?.quantity ?? 0) >= limit;

  function handleClick() {
    if (disabled || atLimit) return;
    const accepted = limit === undefined ? add(code, 1) : add(code, 1, limit);
    if (!accepted) return;
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || atLimit}
      className={`inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
        added
          ? "bg-leaf text-cream"
          : variant === "outline"
            ? "border-ink bg-paper text-ink hover:bg-cream-deep border"
            : "bg-accent text-cream hover:bg-accent-deep"
      } ${className}`}
    >
      {disabled ? disabledLabel : atLimit ? t("inBag") : added ? t("addedCheck") : t("addToBag")}
    </button>
  );
}
