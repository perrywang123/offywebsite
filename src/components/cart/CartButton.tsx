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
      className="inline-flex h-10 items-center gap-1.5 rounded-full border border-sand bg-paper px-3 text-xs uppercase tracking-[var(--tracking-12)] text-ink transition-colors hover:border-ink"
      aria-label={t("cart.openAria")}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M6 8h12l-1 12H7L6 8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.8" />
      </svg>
      <span>{t("cart.title")}</span>
      <span key={count} className="animate-pop inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-cream">
        {count}
      </span>
    </button>
  );
}
