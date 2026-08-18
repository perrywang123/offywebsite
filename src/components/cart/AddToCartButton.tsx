"use client";

import { useTranslations } from "next-intl";
import { useCart } from "./CartProvider";

export function AddToCartButton({
  code,
  className = "",
  accent = false,
}: {
  code: string;
  className?: string;
  accent?: boolean;
}) {
  const t = useTranslations("common.actions");
  const { add } = useCart();

  return (
    <button
      type="button"
      onClick={() => add(code, 1)}
      className={`inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-medium transition-all duration-200 ease-out ${
        accent
          ? "bg-pop-coral text-paper hover:bg-[#e63d20]"
          : "bg-ink-900 text-paper hover:bg-cocoa-600"
      } ${className}`}
    >
      {t("addToCart")}
    </button>
  );
}
