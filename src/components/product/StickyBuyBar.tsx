"use client";

import { useTranslations } from "next-intl";
import { PurchaseActions } from "./PurchaseActions";
import { formatPrice } from "@/lib/pricing";

/**
 * PDP 吸底购买条(方案 §2 E / P0)。
 *
 * 唯一 P0:PDP 首屏在 375×812 下看不到「加入购物袋」,顾客必须滚动才买得到。
 * 三条硬约束:
 *  1. **必须是 `sticky bottom-0`,不能用 `fixed`** —— `[locale]/template.tsx` 把
 *     页面包在 `animate-page-enter`(`fill-mode: both`)里,终态保留
 *     `transform: translateY(0)`,该包裹层因此成为 `fixed` 的 containing block,
 *     用 fixed 的条会被它"钉"在文档流里而不是视口上(方案 F5 / R2)。
 *  2. **祖先链上不能有 `overflow-hidden`/`auto`**,否则 sticky 失效(R3)。
 *  3. 因此它必须挂在**页面内容的最后一个流内子元素**上:sticky + bottom:0 的语义
 *     是"元素自然位置在视口下方时,把它上提贴住视口底",所以条在整页滚动期间
 *     一直贴底,滚到页尾才落回原位 —— 这正是吸底条要的效果。
 *
 * 三态都有条(在售 / 售罄 / 预告),窄屏唯一入口;`md:hidden` 保证 ≥768px
 * 不出现(桌面端信息区已有同一组 Add to Bag / Buy Now)。
 */
export function StickyBuyBar({
  code,
  priceCents,
  currency,
  locale,
  isAvailable,
  isUpcoming,
}: {
  code: string;
  priceCents: number;
  currency: string;
  locale: string;
  isAvailable: boolean;
  isUpcoming: boolean;
}) {
  const t = useTranslations("product");
  const price = formatPrice(priceCents, currency, locale);

  return (
    <div
      data-testid="pdp-buybar"
      className="border-cream-line bg-cream/90 sticky bottom-0 z-30 border-t backdrop-blur md:hidden"
    >
      {/* 内层用 container-site + safe-b:左右与站内版心一致(16px),
          底部留出 home indicator 的安全区(需 layout.tsx 的 viewportFit:"cover")。 */}
      <div className="container-site safe-b pt-3">
        {isUpcoming ? (
          <p className="text-brown-600 text-center text-sm font-medium tracking-[var(--tracking-14)] uppercase">
            {t("upcomingNotice")}
          </p>
        ) : (
          <>
            <div className="mb-2.5 flex items-baseline justify-between gap-3">
              <p className="font-display min-w-0 text-xl font-medium tabular-nums">{price}</p>
              <p className="text-ink-soft shrink-0 text-[11px] tracking-wide">
                1 OFFY · {currency}
              </p>
            </div>
            <PurchaseActions code={code} isAvailable={isAvailable} isUpcoming={isUpcoming} />
          </>
        )}
      </div>
    </div>
  );
}
