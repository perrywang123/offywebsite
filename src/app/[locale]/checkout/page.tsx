"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getProductByCode } from "@/lib/catalog";
import { formatUsdCents } from "@/lib/pricing";
import { useCart } from "@/components/cart/CartProvider";

type Provider = "paypal" | "card";
type Notice = "cancelled" | "failed" | null;

function PaymentLogo({ provider }: { provider: Provider }) {
  if (provider === "paypal") {
    return (
      <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-soft bg-[#0070ba] text-xs font-semibold italic text-paper">
        PayPal
      </span>
    );
  }
  return (
    <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-soft border border-ink-muted/40 text-ink-soft">
      <svg width="20" height="14" viewBox="0 0 24 16" aria-hidden>
        <rect x="1" y="1" width="22" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M1 5h22" stroke="currentColor" strokeWidth="1.5" />
        <rect x="5" y="8" width="4" height="3" rx="1" fill="currentColor" />
      </svg>
    </span>
  );
}

export default function CheckoutPage() {
  const { lines } = useCart();
  const locale = useLocale();
  const t = useTranslations("checkout");
  const [email, setEmail] = useState("");
  const [provider, setProvider] = useState<Provider>("paypal");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice>(null);

  const items = lines
    .map((line) => ({ line, product: getProductByCode(line.code) }))
    .filter((x): x is { line: { code: string; quantity: number }; product: NonNullable<ReturnType<typeof getProductByCode>> } => Boolean(x.product));
  const subtotal = items.reduce((sum, x) => sum + x.product.priceCents * x.line.quantity, 0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("paypal") === "cancelled") setNotice("cancelled");
    else if (params.get("paypal") === "failed") setNotice("failed");
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          items: items.map((x) => ({ code: x.line.code, quantity: x.line.quantity })),
          locale,
          email,
        }),
      });
      const data = await res.json();
      if (res.ok && data.redirect) {
        window.location.href =
          data.redirect.kind === "approve" ? data.redirect.approveUrl : data.redirect.url;
      } else {
        setError(data.error ?? "checkout_failed");
      }
    } catch {
      setError("network_error");
    } finally {
      setSubmitting(false);
    }
  }

  const cardClass = (active: boolean) =>
    `relative flex cursor-pointer items-center gap-3 rounded-card border-2 bg-paper p-4 transition-all duration-200 ease-out ${
      active ? "border-brown-600 ring-2 ring-brown-100" : "border-sand hover:border-brown-500"
    } ${submitting ? "pointer-events-none opacity-60" : ""}`;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 lg:px-8">
      <h1 className="mb-8 font-display text-4xl font-semibold">{t("title")}</h1>

      {notice === "cancelled" && (
        <div className="mb-6 rounded-card bg-info-bg p-4 text-sm text-info">{t("cancelBanner")}</div>
      )}
      {notice === "failed" && (
        <div className="mb-6 rounded-card bg-error-bg p-4 text-sm text-error">{t("failBanner")}</div>
      )}

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
                  readOnly={submitting}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  className="h-12 w-full rounded-soft border border-sand bg-paper px-4 outline-none focus:border-brown-600"
                />
              </label>
            </fieldset>

            {/* 支付方式选择器（单选卡） */}
            <fieldset className="space-y-3">
              <legend className="kicker mb-2">{t("paymentTitle")}</legend>
              <label className={cardClass(provider === "paypal")}>
                <input
                  type="radio"
                  name="payment"
                  value="paypal"
                  checked={provider === "paypal"}
                  onChange={() => setProvider("paypal")}
                  className="sr-only"
                />
                <span className={`h-4 w-4 shrink-0 rounded-full border ${provider === "paypal" ? "border-brown-600" : "border-sand"}`}>
                  {provider === "paypal" && <span className="mx-auto mt-[3px] block h-2 w-2 rounded-full bg-brown-600" />}
                </span>
                <PaymentLogo provider="paypal" />
                <span className="flex-1">
                  <span className="block text-base font-medium text-ink">{t("paymentPaypal")}</span>
                  <span className="mt-0.5 block text-xs text-ink-muted">{t("paymentPaypalSub")}</span>
                </span>
                <span className="absolute right-3 top-3 rounded-full bg-butter px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink">
                  {t("paymentRecommended")}
                </span>
              </label>
              <label className={cardClass(provider === "card")}>
                <input
                  type="radio"
                  name="payment"
                  value="card"
                  checked={provider === "card"}
                  onChange={() => setProvider("card")}
                  className="sr-only"
                />
                <span className={`h-4 w-4 shrink-0 rounded-full border ${provider === "card" ? "border-brown-600" : "border-sand"}`}>
                  {provider === "card" && <span className="mx-auto mt-[3px] block h-2 w-2 rounded-full bg-brown-600" />}
                </span>
                <PaymentLogo provider="card" />
                <span className="flex-1">
                  <span className="block text-base font-medium text-ink">{t("paymentCard")}</span>
                  <span className="mt-0.5 block text-xs text-ink-muted">{t("paymentCardSub")}</span>
                </span>
              </label>
            </fieldset>

            {error && <p className="text-sm text-error">Error: {error}</p>}

            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className="h-12 w-full rounded-full bg-accent text-sm font-medium text-cream transition-colors hover:bg-accent-deep disabled:opacity-70"
            >
              {submitting
                ? t("jumping")
                : provider === "paypal"
                  ? t("payWithPaypal")
                  : t("payWithCard")}
            </button>
            <p className="text-center text-xs text-ink-muted">USD · Stripe Checkout / PayPal</p>
          </form>

          <aside className="h-fit rounded-card bg-paper p-6">
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
            <div className="mt-4 flex justify-between border-t border-cream-line pt-4 font-medium">
              <span>{t("summary")}</span>
              <span className="tabular-nums">{formatUsdCents(subtotal, locale)}</span>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
