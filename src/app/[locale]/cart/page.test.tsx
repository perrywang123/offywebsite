import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 购物袋页(/cart)的 Checkout 必须与购物袋抽屉走**同一条链路**:
 * 直接 POST /api/payments/checkout → 整页跳转 Shopify;失败才回退 /checkout。
 */

const mockPush = vi.fn();
const mockUseCart = vi.fn();

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>{children}</a>
  ),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={typeof src === "string" ? src : ""} />
  ),
}));

vi.mock("@/components/cart/CartProvider", () => ({
  useCart: () => mockUseCart(),
}));

import CartPage from "./page";

function cartWithItem() {
  return {
    lines: [{ code: "noir", quantity: 3 }],
    catalog: {
      noir: {
        code: "noir",
        name: { zh: "诺尔", en: "NOIR" },
        images: ["https://cdn.shopify.com/noir.jpg"],
        priceCents: 4500,
        currency: "USD",
        available: true,
      },
    },
    catalogLoaded: true,
    setQty: vi.fn(),
    remove: vi.fn(),
  };
}

describe("/cart 页 · Checkout 直达 Shopify", () => {
  const realLocation = window.location;
  let assign: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockUseCart.mockReset();
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

  it("不再渲染指向站内 /checkout 的链接,而是一个可点击的 Checkout 按钮", () => {
    mockUseCart.mockReturnValue(cartWithItem());
    render(<CartPage />);
    expect(screen.getByRole("button", { name: "checkout" })).toBeEnabled();
    expect(screen.queryByRole("link", { name: "checkout" })).toBeNull();
  });

  it("点击后 POST /api/payments/checkout 并跳转到返回的 Shopify url", async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ provider: "shopify", redirect: { kind: "redirect", url: "https://offy.myshopify.com/cart/c/cartpage" } }),
    } as unknown as Response));
    vi.stubGlobal("fetch", fetchMock);
    mockUseCart.mockReturnValue(cartWithItem());
    const user = userEvent.setup();
    render(<CartPage />);

    await user.click(screen.getByRole("button", { name: "checkout" }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://offy.myshopify.com/cart/c/cartpage"));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/payments/checkout");
    expect(JSON.parse(String(init?.body))).toEqual({
      provider: "shopify",
      items: [{ code: "noir", quantity: 3 }],
      locale: "en",
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("失败时回退 /checkout 并给出可见提示", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network down");
    }));
    mockUseCart.mockReturnValue(cartWithItem());
    const user = userEvent.setup();
    render(<CartPage />);

    await user.click(screen.getByRole("button", { name: "checkout" }));

    // /cart 一跳走自身就被卸载,所以提示必须先渲染出来、再跳转
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("checkoutFallback"));
    expect(mockPush).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/checkout"), { timeout: 3000 });
  });
});
