"use client";

import { useLocale, useTranslations } from "next-intl";
import type { CartCatalogEntry } from "./CartProvider";
import type { CheckoutBlockedItem } from "./useCheckoutRedirect";

export function BagCheckoutBlocked({
  items,
  catalog,
}: {
  items: CheckoutBlockedItem[];
  catalog: Record<string, CartCatalogEntry>;
}) {
  const locale = useLocale();
  const t = useTranslations("common.cart");
  const limited = items.filter((item) => item.reason === "purchase_limit_exceeded");
  const unavailable = items.filter((item) => item.reason !== "purchase_limit_exceeded");
  const names = (lines: CheckoutBlockedItem[]) =>
    lines.map(({ code }) => catalog[code]?.name[locale === "zh" ? "zh" : "en"] ?? code).join(", ");

  return (
    <div role="alert" className="text-error mb-3 space-y-1 text-xs">
      {limited.length > 0 && <p>{t("checkoutPurchaseLimit", { items: names(limited) })}</p>}
      {unavailable.length > 0 && <p>{t("checkoutBlocked", { items: names(unavailable) })}</p>}
      {items.length === 0 && <p>{t("checkoutBlockedGeneric")}</p>}
    </div>
  );
}
