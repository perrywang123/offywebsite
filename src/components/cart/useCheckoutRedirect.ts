"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";

/**
 * 购物袋的「Checkout」直达 Shopify 托管结算页 —— 不再先落到我们自己的 `/checkout`。
 *
 * Shopify 结算页本来就会收集收货信息,中间那层什么都不做、只是多一次点击。
 * 两条链路因此收拢成一个 hook,供购物袋抽屉(`CartDrawer`)与购物袋页(`/cart`)
 * 共用,避免两处各写一份、日后走偏。
 *
 * 失败(网络错误 / 非 2xx / 没有 `redirect.url`)时回退跳转到 `/checkout` ——
 * 那一层仍然可用,而且 PayPal / Stripe 的回跳地址也指向它。
 */

/** `/api/payments/checkout` 成功响应里的跳转目标(契约见该路由 / `payments/types.ts`)。 */
interface CheckoutRedirect {
  kind?: string;
  url?: string;
  approveUrl?: string;
}

export interface CheckoutItemInput {
  code: string;
  quantity: number;
}

/**
 * 失败提示被看见之后才跳转。
 *
 * 购物袋页(`/cart`)一跳走自身就被卸载,提示若与跳转同帧发生等于没有提示;
 * 留出这一小段停顿,顾客能读到"结算页暂时打不开,已为你打开备用结算页面",
 * 然后落到那层仍然可用的 `/checkout`。抽屉在布局里不会卸载,提示会一直留着。
 */
export const CHECKOUT_FALLBACK_DELAY_MS = 1200;

export interface CheckoutRedirectState {
  /** 请求进行中:按钮应 `disabled` + `aria-busy`,避免重复建单。 */
  pending: boolean;
  /** 直达结算失败、已回退到 `/checkout`(用于展示可见提示)。 */
  failed: boolean;
  /** 发起结算:成功则整页跳转到支付页,失败则回退到 `/checkout`。 */
  startCheckout: (items: CheckoutItemInput[]) => Promise<void>;
}

export function useCheckoutRedirect(): CheckoutRedirectState {
  const locale = useLocale();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  // 同步闸门。`disabled` 依赖 state,而 setState 是异步的:连点两次时第二次
  // click 可能赶在 `pending` 生效之前,光靠 disabled 挡不住,Shopify 那边会
  // 建出两个 cart。用 ref 在**进入函数的第一步**就拦下。
  const inFlight = useRef(false);
  // 失败后的延迟跳转(见 CHECKOUT_FALLBACK_DELAY_MS);顾客在这期间重试成功
  // 就要撤销它,否则会把已经跳到 Shopify 的页面又拽回 /checkout。
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelFallback = useCallback(() => {
    if (fallbackTimer.current) {
      clearTimeout(fallbackTimer.current);
      fallbackTimer.current = null;
    }
  }, []);

  useEffect(() => cancelFallback, [cancelFallback]);

  const startCheckout = useCallback(
    async (items: CheckoutItemInput[]) => {
      if (inFlight.current || items.length === 0) return;
      inFlight.current = true;
      cancelFallback();
      setPending(true);
      setFailed(false);

      let url: string | undefined;
      try {
        const res = await fetch("/api/payments/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // provider 固定 shopify:UI 目前只提供这一条通道(与 `/api/payments/checkout`
          // 既有的"缺省即 Stripe"约定不同,这里必须显式写出来)。
          // 只传 code + quantity,价格一律由服务端按 code 实时解析,客户端不报价。
          body: JSON.stringify({ provider: "shopify", items, locale }),
        });
        // 502/504 之类可能由前置层返回 HTML,`json()` 会抛 —— 就地兜成 null,
        // 走下面同一条回退路径,而不是把解析失败也当成"没有响应"。
        const data = (await res.json().catch(() => null)) as { redirect?: CheckoutRedirect } | null;
        const redirect = data?.redirect;
        const target = redirect?.kind === "approve" ? redirect.approveUrl : redirect?.url;
        if (res.ok && target) url = target;
      } catch {
        /* 网络层失败 → 与"非 2xx / 缺 url"同样处理:回退,绝不静默 */
      }

      if (url) {
        // 成功:整页跳走(Shopify 是站外地址,必须走浏览器导航)。
        // **故意不解除 pending**:浏览器真正卸载前按钮保持禁用,否则跳转途中
        // 再点一次会在 Shopify 建出第二个 cart。
        cancelFallback();
        window.location.assign(url);
        return;
      }

      // 失败:解除 pending 让顾客还能再试,先显示提示,再跳回仍然可用的
      // `/checkout` —— 不能什么都不发生,也不能让顾客卡在原地。
      inFlight.current = false;
      setPending(false);
      setFailed(true);
      cancelFallback();
      fallbackTimer.current = setTimeout(() => {
        fallbackTimer.current = null;
        // 无语言前缀(next-intl `localePrefix: "as-needed"`),不要写成 /en/checkout。
        router.push("/checkout");
      }, CHECKOUT_FALLBACK_DELAY_MS);
    },
    [locale, router, cancelFallback],
  );

  return { pending, failed, startCheckout };
}
