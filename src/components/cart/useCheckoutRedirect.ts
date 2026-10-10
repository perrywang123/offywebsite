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
 * 失败要分成两类,处理方式**不同**(方案 P0-3 / R12):
 *  · `blocked` —— 4xx:服务端明确点名"这些商品买不了"。**绝不跳转**,顾客留在
 *    原地看到商品名 + 可执行的下一步,并且能立刻重试;
 *  · `failed` —— 网络错误 / 5xx / 200 但缺 redirect:这层打不开,回退到仍然可用
 *    的 `/checkout`(PayPal / Stripe 的回跳地址也指向它)。
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

/** 4xx 里被点名的商品(与 `payments/types.ts` 的 `CheckoutItemFailure` 对齐)。 */
export interface CheckoutBlockedItem {
  code: string;
  reason?: "unknown_items" | "unavailable_items";
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
  /**
   * 4xx:服务端点名了买不了的商品,**没有跳转**。为空数组表示"被拒但没说是哪件"
   * (例如请求体不合法),此时调用方渲染通用文案,顾客仍留在原地可重试。
   * `null` = 当前没有这种情况。
   */
  blocked: CheckoutBlockedItem[] | null;
  /** 发起结算:成功则整页跳转到支付页,4xx 留在原地,其余回退到 `/checkout`。 */
  startCheckout: (items: CheckoutItemInput[]) => Promise<void>;
}

export function useCheckoutRedirect(): CheckoutRedirectState {
  const locale = useLocale();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [blocked, setBlocked] = useState<CheckoutBlockedItem[] | null>(null);
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
      setBlocked(null);

      let url: string | undefined;
      let rejected: CheckoutBlockedItem[] | null = null;
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
        const data = (await res.json().catch(() => null)) as {
          redirect?: CheckoutRedirect;
          items?: CheckoutBlockedItem[];
        } | null;
        if (res.ok) {
          const redirect = data?.redirect;
          const target = redirect?.kind === "approve" ? redirect.approveUrl : redirect?.url;
          if (target) url = target;
        } else if (res.status >= 400 && res.status < 500) {
          // 服务端已经把"哪件商品买不了"说清楚了:留在原地,不跳 /checkout。
          // (429/408 之类的 4xx 也落在这里 —— 同样不该把顾客送去兜底结算页。)
          rejected = Array.isArray(data?.items)
            ? data.items.filter((i): i is CheckoutBlockedItem => Boolean(i?.code))
            : [];
        }
      } catch {
        /* 网络层失败 → 与"5xx / 缺 url"同样处理:回退,绝不静默 */
      }

      if (url) {
        // 成功:整页跳走(Shopify 是站外地址,必须走浏览器导航)。
        // **故意不解除 pending**:浏览器真正卸载前按钮保持禁用,否则跳转途中
        // 再点一次会在 Shopify 建出第二个 cart。
        cancelFallback();
        window.location.assign(url);
        return;
      }

      // 4xx:解除 pending 让顾客能原地重试,提示留在页面上,不跳转。
      if (rejected) {
        inFlight.current = false;
        setPending(false);
        setFailed(false);
        setBlocked(rejected);
        cancelFallback();
        return;
      }

      // 其余失败:解除 pending 让顾客还能再试,先显示提示,再跳回仍然可用的
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

  return { pending, failed, blocked, startCheckout };
}
