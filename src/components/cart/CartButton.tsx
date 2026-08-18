"use client";

import { useCart } from "./CartProvider";

export function CartButton() {
  const { count, open } = useCart();

  return (
    <button
      type="button"
      onClick={open}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-sand-200 bg-paper text-ink-900 transition-colors hover:border-ink-900"
      aria-label="Open bag"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6 8h12l-1 12H7L6 8Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.8" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-pop-coral px-1 text-xs font-bold text-paper">
          {count}
        </span>
      )}
    </button>
  );
}
