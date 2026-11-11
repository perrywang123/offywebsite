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
      className="text-ink md:border-sand md:bg-paper md:hover:border-ink relative inline-flex h-11 min-w-11 items-center justify-center border border-transparent text-xs tracking-[var(--tracking-12)] uppercase transition-colors md:gap-1.5 md:rounded-full md:px-3 lg:h-10"
      aria-label={t("cart.openAria")}
    >
      <svg
        width="22"
        height="22"
        className="md:h-[15px] md:w-[15px]"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d="M6 8h12l-1 12H7L6 8Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.8" />
      </svg>
      <span className="hidden md:inline">{t("cart.title")}</span>
      <span
        key={count}
        className="animate-pop bg-accent text-cream ring-paper absolute top-0.5 right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[11px] leading-none font-semibold ring-2 md:static md:px-1 md:ring-0"
      >
        {count}
      </span>
    </button>
  );
}
