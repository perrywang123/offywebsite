import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockClose = vi.fn();
const mockUseCart = vi.fn();
const mockPush = vi.fn();

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>{children}</a>
  ),
  // 直达 Shopify 失败时的兜底跳转(next-intl 的 router),断言用。
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

import { CartDrawer } from "./CartDrawer";

function baseCart(overrides: Record<string, unknown> = {}) {
  return {
    lines: [],
    catalog: {},
    catalogLoaded: true,
    isOpen: true,
    mounted: true,
    close: mockClose,
    setQty: vi.fn(),
    remove: vi.fn(),
    ...overrides,
  };
}

describe("CartDrawer a11y (dialog)", () => {
  beforeEach(() => {
    mockUseCart.mockReset();
    mockClose.mockClear();
  });

  it("moves focus into the drawer when opened", () => {
    mockUseCart.mockReturnValue(baseCart());
    render(<CartDrawer />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("closes on Escape", () => {
    mockUseCart.mockReturnValue(baseCart());
    render(<CartDrawer />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("labels the dialog for screen readers", () => {
    mockUseCart.mockReturnValue(baseCart());
    render(<CartDrawer />);
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("dialog")).toHaveAccessibleName();
  });
});

describe("CartDrawer × live catalog (/api/products-backed)", () => {
  beforeEach(() => {
    mockUseCart.mockReset();
    mockClose.mockClear();
  });

  it("renders a cart line using the live catalog entry(name/price/image), not a bundled static import", () => {
    mockUseCart.mockReturnValue(
      baseCart({
        lines: [{ code: "noir", quantity: 2 }],
        catalog: {
          noir: { code: "noir", name: { zh: "诺尔", en: "NOIR" }, images: ["https://cdn.shopify.com/noir.jpg"], priceCents: 4500, currency: "USD", available: true },
        },
      }),
    );
    render(<CartDrawer />);
    expect(screen.getByText("诺尔")).toBeInTheDocument();
    // alt 应跟随当前 locale(此测试 mock useLocale 为 "zh")取中文名,
    // 而不是此前一直硬编码的英文名(此前即便中文站也显示英文 alt,是一个
    // 真实的本地化缺陷)。
    expect(screen.getByAltText("诺尔")).toHaveAttribute("src", "https://cdn.shopify.com/noir.jpg");
  });

  it("hides a cart line whose code is not (yet / no longer) present in the live catalog", () => {
    mockUseCart.mockReturnValue(
      baseCart({
        lines: [{ code: "zombie-code", quantity: 1 }],
        catalog: {},
      }),
    );
    render(<CartDrawer />);
    expect(screen.getByText("empty")).toBeInTheDocument();
  });

  it("renders each line and the subtotal in the line's own market currency (GBP), not in USD", () => {
    // 价格按访客所在市场返回(英国访客 → GBP),购物袋不能把它当成美元印出来。
    mockUseCart.mockReturnValue(
      baseCart({
        lines: [{ code: "noir", quantity: 2 }],
        catalog: {
          noir: { code: "noir", name: { zh: "诺尔", en: "NOIR" }, images: ["https://cdn.shopify.com/noir.jpg"], priceCents: 3790, currency: "GBP", available: true },
        },
      }),
    );
    render(<CartDrawer />);
    // 行价 £37.90(同一行在英文站是 £37.90、在中文站也是 £37.90)
    expect(screen.getAllByText("£37.90").length).toBeGreaterThan(0);
    // 小计 = 2 × £37.90,而且**没有**出现美元符号
    expect(screen.getByText("£75.80")).toBeInTheDocument();
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
  });

  it("shows a loading state instead of a false 'empty cart' while the live catalog is still loading", () => {
    mockUseCart.mockReturnValue(
      baseCart({
        lines: [{ code: "noir", quantity: 1 }],
        catalog: {},
        catalogLoaded: false,
      }),
    );
    render(<CartDrawer />);
    expect(screen.queryByText("empty")).not.toBeInTheDocument();
  });
});

describe("CartDrawer · Checkout 直达 Shopify(不再先进 /checkout)", () => {
  const realLocation = window.location;
  let assign: ReturnType<typeof vi.fn>;

  /** 一行真实存在的商品(实时目录条目)。 */
  const cartWithItem = () =>
    baseCart({
      lines: [{ code: "noir", quantity: 2 }],
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
    });

  beforeEach(() => {
    mockUseCart.mockReset();
    mockClose.mockClear();
    mockPush.mockClear();
    assign = vi.fn();
    // jsdom 的 location 是 unforgeable(单个方法不可 spy),整体换成替身。
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

  it("点击 Checkout 直接 POST /api/payments/checkout,并整页跳转到返回的 Shopify url", async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ provider: "shopify", redirect: { kind: "redirect", url: "https://offy.myshopify.com/cart/c/abc" } }),
    } as unknown as Response));
    vi.stubGlobal("fetch", fetchMock);
    mockUseCart.mockReturnValue(cartWithItem());
    const user = userEvent.setup();
    render(<CartDrawer />);

    await user.click(screen.getByRole("button", { name: "checkout" }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://offy.myshopify.com/cart/c/abc"));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/payments/checkout");
    expect(init?.method).toBe("POST");
    // provider 由客户端显式指定 shopify(UI 只有这一条通道),locale 取 useLocale()
    expect(JSON.parse(String(init?.body))).toEqual({
      provider: "shopify",
      items: [{ code: "noir", quantity: 2 }],
      locale: "zh",
    });
    expect(mockPush).not.toHaveBeenCalled();
    // 旧的站内链接已不存在:Checkout 不再指向我们自己的 /checkout
    expect(screen.queryByRole("link", { name: "checkout" })).toBeNull();
  });

  it("请求进行中:按钮 disabled + aria-busy + 文案变化,连点只发一次请求", async () => {
    let resolveFetch: (r: Response) => void = () => {};
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      () => new Promise<Response>((resolve) => (resolveFetch = resolve)),
    );
    vi.stubGlobal("fetch", fetchMock);
    mockUseCart.mockReturnValue(cartWithItem());
    const user = userEvent.setup();
    render(<CartDrawer />);

    await user.click(screen.getByRole("button", { name: "checkout" }));

    const button = await screen.findByRole("button", { name: "checkoutRedirecting" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    // 连点:disabled 挡一层,handler 里的 inFlight ref 再挡一层
    fireEvent.click(button);
    fireEvent.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFetch({
        ok: true,
        status: 200,
        json: async () => ({ provider: "shopify", redirect: { kind: "redirect", url: "https://offy.myshopify.com/cart/c/once" } }),
      } as Response);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledTimes(1);
  });

  it("失败(网络错误)时回退跳转 /checkout,并显示可见提示 —— 不静默、不卡住", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network down");
    }));
    mockUseCart.mockReturnValue(cartWithItem());
    const user = userEvent.setup();
    render(<CartDrawer />);

    await user.click(screen.getByRole("button", { name: "checkout" }));

    // 提示先出现(失败绝不静默),随后才回退跳转
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("checkoutFallback"));
    expect(mockPush).not.toHaveBeenCalled();
    // 失败后按钮复活(顾客还能重试),不是一直转圈
    expect(screen.getByRole("button", { name: "checkout" })).toBeEnabled();
    expect(assign).not.toHaveBeenCalled();

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/checkout"), { timeout: 3000 });
  });

  it("接口返回非 2xx 时同样回退 /checkout(不把错误页当成结算页跳过去)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => ({ error: "shopify_error" }),
    })));
    mockUseCart.mockReturnValue(cartWithItem());
    const user = userEvent.setup();
    render(<CartDrawer />);

    await user.click(screen.getByRole("button", { name: "checkout" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/checkout"), { timeout: 3000 });
    expect(assign).not.toHaveBeenCalled();
  });

  it("200 但没有 redirect.url 时也回退 /checkout", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ provider: "shopify", redirect: { kind: "redirect" } }),
    })));
    mockUseCart.mockReturnValue(cartWithItem());
    const user = userEvent.setup();
    render(<CartDrawer />);

    await user.click(screen.getByRole("button", { name: "checkout" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/checkout"), { timeout: 3000 });
    expect(assign).not.toHaveBeenCalled();
  });
});
