"use client";

import { useTranslations } from "next-intl";
import { useCart } from "./CartProvider";

export function CartButton() {
  const { count, open } = useCart();
  const t = useTranslations("common");

  return (
    <button
      type="button"
      onClick={open}
      className="border-sand bg-paper text-ink hover:border-ink inline-flex h-11 items-center gap-1.5 rounded-full border px-3 text-xs tracking-[var(--tracking-12)] uppercase transition-colors lg:h-10"
      aria-label={t("cart.openAria")}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6 8h12l-1 12H7L6 8Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.8" />
      </svg>
      <span>{t("cart.title")}</span>
      <span
        key={count}
        className="animate-pop bg-accent text-cream inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[11px] font-semibold"
      >
        {count}
      </span>
    </button>
  );
}
