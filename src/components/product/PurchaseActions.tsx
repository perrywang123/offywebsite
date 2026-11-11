"use client";

import { useTranslations } from "next-intl";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { useCheckoutRedirect } from "@/components/cart/useCheckoutRedirect";
import { useOptionalMarket } from "@/components/market/MarketProvider";

export interface PurchaseActionsProps {
  code: string;
  isAvailable: boolean;
  isUpcoming: boolean;
}

/** Same checkout path as the bag; the submitted list deliberately excludes saved bag lines. */
export function PurchaseActions({ code, isAvailable, isUpcoming }: PurchaseActionsProps) {
  const t = useTranslations("product");
  const ta = useTranslations("common.actions");
  const market = useOptionalMarket();
  const checkout = useCheckoutRedirect(undefined, "buy-now");
  if (isUpcoming) return null;
  const mustRefresh = checkout.destinationChanged || checkout.blocked !== null;
  const buy = () => void checkout.startCheckout([{ code, quantity: 1 }]);
  return (
    <div>
      {mustRefresh ? (
        <p role="alert" className="text-error mb-3 text-xs leading-relaxed">
          {checkout.destinationChanged ? t("buyNowDestinationChanged") : t("buyNowUnavailable")}{" "}
          <button
            type="button"
            className="min-h-11 underline"
            onClick={() => window.location.reload()}
          >
            {t("refreshProduct")}
          </button>
        </p>
      ) : checkout.failed ? (
        <p role="alert" className="text-error mb-3 text-xs leading-relaxed">
          {t("buyNowFailed")}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2.5">
        <AddToCartButton
          code={code}
          variant="outline"
          disabled={checkout.pending || !isAvailable}
          disabledLabel={ta("addToBag")}
          className="min-w-0 px-2"
        />
        <button
          type="button"
          onClick={buy}
          disabled={
            checkout.pending || !isAvailable || mustRefresh || (market ? !market.ready : false)
          }
          aria-busy={checkout.pending}
          aria-label={checkout.pending ? t("openingCheckout") : undefined}
          className="bg-accent text-cream hover:bg-accent-deep inline-flex h-12 min-w-0 items-center justify-center gap-2 rounded-full px-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          {checkout.pending && (
            <span
              aria-hidden="true"
              className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-r-transparent motion-reduce:animate-none"
            />
          )}
          {!isAvailable
            ? t("outOfStock")
            : checkout.pending
              ? t("opening")
              : checkout.failed
                ? t("tryAgain")
                : t("buyNow")}
        </button>
      </div>
    </div>
  );
}
