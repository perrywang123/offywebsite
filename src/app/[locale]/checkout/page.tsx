"use client";

/**
 * ⚠️ 备用结算页 —— **正常购买路径不再经过这里**。
 *
 * 购物袋抽屉(`src/components/cart/CartDrawer.tsx`)与购物袋页
 * (`src/app/[locale]/cart/page.tsx`)的 Checkout 现在直接
 * POST `/api/payments/checkout` 并整页跳转到 **Shopify 托管结算页**
 * (收货信息本来就由 Shopify 收集,中间那层只是多一次点击)。
 *
 * 本页**仍然需要**,不是死页面,请勿按"没人访问"清理:
 *   1. 直达 Shopify 失败(网络错误 / 非 2xx / 没有 `redirect.url`)时的兜底落点
 *      —— 见 `src/components/cart/useCheckoutRedirect.ts`;
 *   2. PayPal 与 Stripe 的**回跳地址仍指向本页**:
 *      `src/server/checkout/create-checkout-session.ts`、
 *      `src/server/payments/paypal/provider.ts`、
 *      `src/app/[locale]/checkout/paypal-return/route.ts`。
 */

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cartTotal, formatPrice } from "@/lib/pricing";
import { useCart, type CartCatalogEntry } from "@/components/cart/CartProvider";

type Provider = "paypal" | "stripe" | "shopify";
type Notice = "cancelled" | "failed" | null;

const COUNTRIES: Array<[string, string]> = [
  ["US", "美国 / United States"],
  ["SG", "新加坡 / Singapore"],
  ["CN", "中国大陆 / China"],
  ["HK", "中国香港 / Hong Kong"],
  ["JP", "日本 / Japan"],
  ["KR", "韩国 / South Korea"],
  ["TW", "中国台湾 / Taiwan"],
  ["GB", "英国 / United Kingdom"],
  ["AU", "澳大利亚 / Australia"],
  ["CA", "加拿大 / Canada"],
  ["DE", "德国 / Germany"],
  ["FR", "法国 / France"],
];

function PaymentLogo({ provider }: { provider: Provider }) {
  if (provider === "paypal") {
    return (
      <span className="rounded-soft text-paper flex h-10 w-14 shrink-0 items-center justify-center bg-[#0070ba] text-xs font-semibold italic">
        PayPal
      </span>
    );
  }
  if (provider === "shopify") {
    return (
      <span className="rounded-soft text-paper flex h-10 w-14 shrink-0 items-center justify-center bg-[#5a863e] text-[11px] font-semibold">
        Shopify
      </span>
    );
  }
  return (
    <span className="rounded-soft border-ink-muted/40 text-ink-soft flex h-10 w-14 shrink-0 items-center justify-center border">
      <svg width="20" height="14" viewBox="0 0 24 16" aria-hidden>
        <rect
          x="1"
          y="1"
          width="22"
          height="14"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M1 5h22" stroke="currentColor" strokeWidth="1.5" />
        <rect x="5" y="8" width="4" height="3" rx="1" fill="currentColor" />
      </svg>
    </span>
  );
}

const inputCls =
  "h-12 w-full rounded-soft border border-sand bg-paper px-4 text-base outline-none transition-colors focus:border-brown-600";

export default function CheckoutPage() {
  // `catalog`(来自 /api/products 实时拉取)取代直接 import 本地静态目录 ——
  // 否则本地完全没有记录的新商品加入购物车后会在结算页被静默过滤掉,
  // 表现为"购物车显示是空的",无法下单。
  const { lines, catalog, catalogLoaded } = useCart();
  const locale = useLocale();
  const t = useTranslations("checkout");
  const tCart = useTranslations("common.cart");

  // 默认必须是唯一可用的那条:此前默认 paypal,而 PayPal/Stripe 在本环境都是 502,
  // 顾客不动选项直接点结算就会失败。
  const [provider] = useState<Provider>("shopify");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("US");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice>(null);

  const items = lines
    .map((line) => ({ line, product: catalog[line.code] }))
    .filter((x): x is { line: { code: string; quantity: number }; product: CartCatalogEntry } =>
      Boolean(x.product),
    );
  // 逐行按该行自己的币种显示;小计由 cartTotal 汇总(混币时不硬加,只置位提示)。
  const subtotal = cartTotal(
    items.map((x) => ({
      priceCents: x.product.priceCents,
      currency: x.product.currency,
      quantity: x.line.quantity,
    })),
  );

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
          shipping: { fullName, phone, country, city, state, address1, address2, postalCode },
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
    <div className="container-site section-y lg:py-12">
      <h1 className="font-display mb-8 text-4xl font-semibold">{t("title")}</h1>

      {notice === "cancelled" && (
        <div className="rounded-card bg-info-bg text-info mb-6 p-4 text-sm">
          {t("cancelBanner")}
        </div>
      )}
      {notice === "failed" && (
        <div className="rounded-card bg-error-bg text-error mb-6 p-4 text-sm">
          {t("failBanner")}
        </div>
      )}

      {!catalogLoaded && lines.length > 0 ? (
        <p className="text-ink-muted text-center text-sm">{tCart("loading")}</p>
      ) : items.length === 0 ? (
        <div className="text-center">
          <p className="text-ink-muted">{t("empty")}</p>
          {/* 空态 CTA 原来是 141×20px 的文字链(方案 #43):与抽屉/购物袋页的空态
              统一成同一颗胶囊按钮,触屏上才有 48px 的命中区。 */}
          <Link
            href="/products"
            className="bg-ink text-cream mt-6 inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-medium"
          >
            {t("emptyCta")} →
          </Link>
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 联系方式 */}
            <fieldset className="bg-paper rounded-2xl p-6">
              <legend className="kicker mb-4">{t("contact")}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-ink-soft mb-2 block text-sm">{t("email")}</span>
                  <input
                    type="email"
                    required
                    value={email}
                    readOnly={submitting}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder={t("emailPlaceholder")}
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className="text-ink-soft mb-2 block text-sm">{t("phone")}</span>
                  <input
                    type="tel"
                    value={phone}
                    readOnly={submitting}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    placeholder={t("phonePh")}
                    className={inputCls}
                  />
                </label>
              </div>
            </fieldset>

            {/* 收货信息 */}
            <fieldset className="bg-paper rounded-2xl p-6">
              <legend className="kicker mb-4">{t("shipping")}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-ink-soft mb-2 block text-sm">{t("fullName")}</span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    readOnly={submitting}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    placeholder={t("fullNamePh")}
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className="text-ink-soft mb-2 block text-sm">{t("country")}</span>
                  <select
                    value={country}
                    disabled={submitting}
                    onChange={(e) => setCountry(e.target.value)}
                    autoComplete="country"
                    className={inputCls}
                  >
                    {COUNTRIES.map(([code, label]) => (
                      <option key={code} value={code}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-ink-soft mb-2 block text-sm">{t("postalCode")}</span>
                  <input
                    type="text"
                    required
                    value={postalCode}
                    readOnly={submitting}
                    onChange={(e) => setPostalCode(e.target.value)}
                    autoComplete="postal-code"
                    inputMode="numeric"
                    placeholder={t("postalCodePh")}
                    className={inputCls}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-ink-soft mb-2 block text-sm">{t("address1")}</span>
                  <input
                    type="text"
                    required
                    value={address1}
                    readOnly={submitting}
                    onChange={(e) => setAddress1(e.target.value)}
                    autoComplete="address-line1"
                    placeholder={t("address1Ph")}
                    className={inputCls}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-ink-soft mb-2 block text-sm">{t("address2")}</span>
                  <input
                    type="text"
                    value={address2}
                    readOnly={submitting}
                    onChange={(e) => setAddress2(e.target.value)}
                    autoComplete="address-line2"
                    placeholder={t("address2Ph")}
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className="text-ink-soft mb-2 block text-sm">{t("city")}</span>
                  <input
                    type="text"
                    required
                    value={city}
                    readOnly={submitting}
                    onChange={(e) => setCity(e.target.value)}
                    autoComplete="address-level2"
                    placeholder={t("cityPh")}
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className="text-ink-soft mb-2 block text-sm">{t("state")}</span>
                  <input
                    type="text"
                    value={state}
                    readOnly={submitting}
                    onChange={(e) => setState(e.target.value)}
                    autoComplete="address-level1"
                    placeholder={t("statePh")}
                    className={inputCls}
                  />
                </label>
              </div>
            </fieldset>

            {/* 支付方式 */}
            <fieldset className="space-y-3">
              <legend className="kicker mb-2">{t("paymentTitle")}</legend>
              {/* 只提供 Shopify 托管结算:另外两条通道(Stripe/PayPal)实测在本环境不可用
                  —— Stripe 报 Invalid API Key、PayPal 报 token_request_failed,而且默认选中的
                  恰好是坏的那一个,顾客点结算直接 502。按用户要求只留 Shopify。
                  单选结构保留(而不是写死一段说明),这样将来补上密钥要恢复多选时改动最小。 */}
              <label className={cardClass(true)}>
                <input
                  type="radio"
                  name="payment"
                  value="shopify"
                  checked
                  readOnly
                  className="sr-only"
                />
                <span className="border-brown-600 h-4 w-4 shrink-0 rounded-full border">
                  <span className="bg-brown-600 mx-auto mt-[3px] block h-2 w-2 rounded-full" />
                </span>
                <PaymentLogo provider="shopify" />
                <span className="flex-1">
                  <span className="text-ink block text-base font-medium">
                    {t("paymentShopify")}
                  </span>
                  <span className="text-ink-muted mt-0.5 block text-xs">
                    {t("paymentShopifySub")}
                  </span>
                </span>
              </label>
            </fieldset>

            {error && (
              <p className="text-error text-sm">
                {t("errorPrefix")}
                {error === "checkout_failed"
                  ? t("errorCheckoutFailed")
                  : error === "network_error"
                    ? t("errorNetwork")
                    : error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className="bg-accent text-cream hover:bg-accent-deep h-12 w-full rounded-full text-sm font-medium transition-colors disabled:opacity-70"
            >
              {submitting ? t("jumping") : t("payWithShopify")}
            </button>
            <p className="text-ink-muted text-center text-xs">{t("paymentNote")}</p>
          </form>

          <aside className="rounded-card bg-paper order-first h-fit p-6 lg:order-none">
            <p className="mb-4 font-semibold">{t("summary")}</p>
            <ul className="space-y-3 text-sm">
              {items.map(({ line, product }) => (
                <li key={line.code} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    {locale === "zh" ? product.name.zh : product.name.en} × {line.quantity}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatPrice(product.priceCents * line.quantity, product.currency, locale)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="border-cream-line mt-4 flex justify-between border-t pt-4 font-medium">
              <span>{t("summary")}</span>
              <span className="tabular-nums">
                {formatPrice(subtotal.cents, subtotal.currency, locale)}
              </span>
            </div>
            {subtotal.mixed && (
              <p className="text-ink-muted mt-2 text-xs">{tCart("mixedCurrency")}</p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
