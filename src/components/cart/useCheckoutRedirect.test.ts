import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 购物袋「Checkout」直达 Shopify 的行为契约(抽屉与 /cart 页共用这一个 hook)。
 *
 * 用 mock fetch,不打真实 Shopify;`window.location` 在 jsdom 里是
 * "unforgeable"(单个方法不可 spy),所以整体替换成一个可观测的替身。
 */

const mockPush = vi.fn();

vi.mock("next-intl", () => ({ useLocale: () => "en" }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));

import { CHECKOUT_FALLBACK_DELAY_MS, useCheckoutRedirect } from "./useCheckoutRedirect";

const realLocation = window.location;
let assign: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockPush.mockClear();
  assign = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { href: "http://localhost:3000/cart", assign, replace: vi.fn() },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: realLocation });
});

const ITEMS = [{ code: "noir", quantity: 2 }];

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function mockFetch(handler: () => Promise<Response>) {
  const fetchMock = vi.fn<FetchLike>(handler);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function ok(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

function failed(status: number, body: unknown): Response {
  return { ok: false, status, json: async () => body } as unknown as Response;
}

/** 前置层(CDN / 502 页面)返回 HTML 时的形状:`json()` 解析失败。 */
function notJson(): Response {
  return {
    ok: true,
    status: 200,
    json: async () => {
      throw new SyntaxError("Unexpected token < in JSON at position 0");
    },
  } as unknown as Response;
}

describe("useCheckoutRedirect · 成功路径", () => {
  it("POST /api/payments/checkout(provider=shopify + code/quantity + locale),拿到 url 后整页跳过去", async () => {
    const fetchMock = mockFetch(async () => ok({ provider: "shopify", redirect: { kind: "redirect", url: "https://offy.myshopify.com/cart/c/abc" } }));
    const { result } = renderHook(() => useCheckoutRedirect());

    await act(async () => {
      await result.current.startCheckout(ITEMS);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/payments/checkout");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ provider: "shopify", items: ITEMS, locale: "en" });
    expect(assign).toHaveBeenCalledWith("https://offy.myshopify.com/cart/c/abc");
    // 成功就不该再走 /checkout 兜底
    expect(mockPush).not.toHaveBeenCalled();
    // 跳转途中按钮保持禁用:解除 pending 会让顾客在页面卸载前再点一次,
    // 在 Shopify 那边建出第二个 cart。
    expect(result.current.pending).toBe(true);
  });

  it("kind=approve 时跳 approveUrl(PayPal 风格的响应形状)", async () => {
    mockFetch(async () => ok({ provider: "paypal", redirect: { kind: "approve", orderId: "o1", approveUrl: "https://paypal.example/approve", returnUrl: "/checkout" } }));
    const { result } = renderHook(() => useCheckoutRedirect());

    await act(async () => {
      await result.current.startCheckout(ITEMS);
    });

    expect(assign).toHaveBeenCalledWith("https://paypal.example/approve");
  });
});

describe("useCheckoutRedirect · 防重复提交", () => {
  it("同一 tick 内连点两次只发一次请求(只建一个 cart)", async () => {
    let resolveFetch: (r: Response) => void = () => {};
    const fetchMock = mockFetch(() => new Promise<Response>((resolve) => (resolveFetch = resolve)));
    const { result } = renderHook(() => useCheckoutRedirect());

    await act(async () => {
      // 不 await 第一次:模拟"顾客连点两下",此时 React 还没来得及重渲染出 disabled
      void result.current.startCheckout(ITEMS);
      void result.current.startCheckout(ITEMS);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFetch(ok({ provider: "shopify", redirect: { kind: "redirect", url: "https://offy.myshopify.com/cart/c/once" } }));
    });
    expect(assign).toHaveBeenCalledTimes(1);
  });

  it("空购物袋不请求(不发无意义的下单)", async () => {
    const fetchMock = mockFetch(async () => ok({}));
    const { result } = renderHook(() => useCheckoutRedirect());

    await act(async () => {
      await result.current.startCheckout([]);
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });
});

describe("useCheckoutRedirect · 失败兜底", () => {
  const cases: Array<[string, () => Promise<Response>]> = [
    ["网络错误(fetch reject)", async () => { throw new Error("network down"); }],
    ["非 2xx(502 shopify_error)", async () => failed(502, { error: "shopify_error" })],
    ["200 但没有 redirect.url", async () => ok({ provider: "shopify", redirect: { kind: "redirect" } })],
    ["响应体不是 JSON(前置层返回 HTML)", async () => notJson()],
  ];

  beforeEach(() => {
    // 失败后是"先显示提示、再跳转"(见 CHECKOUT_FALLBACK_DELAY_MS),用假定时器精确断言。
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(cases)("%s → 先置位 failed,再跳回 /checkout(不静默、不卡住)", async (_name, handler) => {
    mockFetch(handler);
    const { result } = renderHook(() => useCheckoutRedirect());

    await act(async () => {
      await result.current.startCheckout(ITEMS);
    });

    expect(assign).not.toHaveBeenCalled();
    expect(result.current.failed).toBe(true);
    // 顾客还能在兜底页/再次点击重试,不是一直转圈
    expect(result.current.pending).toBe(false);
    // 提示先出现,跳转留出被看见的时间
    expect(mockPush).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(CHECKOUT_FALLBACK_DELAY_MS);
    });

    // 站内路径无语言前缀:`/checkout`,不是 `/en/checkout`
    expect(mockPush).toHaveBeenCalledWith("/checkout");
  });

  it("失败提示期间重试成功:撤销那次兜底跳转,直接去 Shopify", async () => {
    let first = true;
    mockFetch(async () => {
      if (first) {
        first = false;
        throw new Error("network down");
      }
      return ok({ provider: "shopify", redirect: { kind: "redirect", url: "https://offy.myshopify.com/cart/c/retry" } });
    });
    const { result } = renderHook(() => useCheckoutRedirect());

    await act(async () => {
      await result.current.startCheckout(ITEMS);
    });
    expect(result.current.failed).toBe(true);

    await act(async () => {
      await result.current.startCheckout(ITEMS);
    });

    expect(assign).toHaveBeenCalledWith("https://offy.myshopify.com/cart/c/retry");
    expect(result.current.failed).toBe(false);

    // 未撤销的兜底定时器会把已经跳走的页面又拽回 /checkout
    await act(async () => {
      vi.advanceTimersByTime(CHECKOUT_FALLBACK_DELAY_MS * 2);
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
