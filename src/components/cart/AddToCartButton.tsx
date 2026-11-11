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
}: {
  code: string;
  className?: string;
  disabled?: boolean;
  variant?: "solid" | "outline";
  disabledLabel?: string;
}) {
  const [added, setAdded] = useState(false);
  const t = useTranslations("common.actions");
  const { add } = useCart();

  function handleClick() {
    if (disabled) return;
    add(code, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
        added
          ? "bg-leaf text-cream"
          : variant === "outline"
            ? "border-ink bg-paper text-ink hover:bg-cream-deep border"
            : "bg-accent text-cream hover:bg-accent-deep"
      } ${className}`}
    >
      {disabled ? disabledLabel : added ? t("addedCheck") : t("addToBag")}
    </button>
  );
}
