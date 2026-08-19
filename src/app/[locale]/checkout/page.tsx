"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getProductByCode } from "@/lib/catalog";
import { formatUsdCents } from "@/lib/pricing";
import { useCart } from "@/components/cart/CartProvider";

export default function CheckoutPage() {
  const { lines } = useCart();
  const locale = useLocale();
  const t = useTranslations("checkout");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const items = lines
    .map((line) => ({ line, product: getProductByCode(line.code) }))
    .filter((x): x is { line: { code: string; quantity: number }; product: NonNullable<ReturnType<typeof getProductByCode>> } => Boolean(x.product));

  const subtotal = items.reduce((sum, x) => sum + x.product.priceCents * x.line.quantity, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((x) => ({ code: x.line.code, quantity: x.line.quantity })),
          locale,
          email,
        }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "checkout_failed");
      }
    } catch {
      setError("network_error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
      <h1 className="mb-8 font-display text-4xl font-semibold">{t("title")}</h1>

      {items.length === 0 ? (
        <p className="text-ink-muted">No items to check out.</p>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <fieldset className="rounded-2xl bg-paper p-6">
              <legend className="mb-4 font-semibold">{t("contact")}</legend>
              <label className="block">
                <span className="mb-2 block text-sm text-ink-soft">{t("email")}</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  className="h-12 w-full rounded-xl border border-sand bg-paper px-4 outline-none focus:border-ink"
                />
              </label>
            </fieldset>

            {error && <p className="text-sm text-error">Error: {error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="h-12 w-full rounded-full bg-accent text-sm font-medium text-paper disabled:opacity-50"
            >
              {submitting ? "…" : t("submit")}
            </button>
            <p className="text-center text-xs text-ink-muted">
              Test mode · USD · Stripe Checkout
            </p>
          </form>

          <aside className="h-fit rounded-2xl bg-paper p-6">
            <p className="mb-4 font-semibold">{t("summary")}</p>
            <ul className="space-y-3 text-sm">
              {items.map(({ line, product }) => (
                <li key={line.code} className="flex justify-between">
                  <span>
                    {locale === "zh" ? product.name.zh : product.name.en} × {line.quantity}
                  </span>
                  <span>{formatUsdCents(product.priceCents * line.quantity, locale)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between border-t border-sand pt-4 font-medium">
              <span>{t("summary")}</span>
              <span>{formatUsdCents(subtotal, locale)}</span>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
