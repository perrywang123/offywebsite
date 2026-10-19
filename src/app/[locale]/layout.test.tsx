import { renderToStaticMarkup } from "react-dom/server";

// 布局会 import 全局 Tailwind CSS;测试不需要样式,且仓库的 PostCSS 配置是
// Next 专用格式,Vite 的 CSS 管线解析不了 —— 直接替换成空模块。
vi.mock("../globals.css", () => ({}));
import { describe, expect, it, vi } from "vitest";

/**
 * 根布局的 JSON-LD 契约:Organization + WebSite 全站各一份。
 *
 * 布局依赖请求上下文、实时目录与一堆客户端壳组件,这里只保留与结构化数据
 * 有关的路径(真实字典 + 真路由配置),其它外壳换成空替身。
 */
vi.mock("next-intl", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next-intl")>()),
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
  setRequestLocale: () => {},
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound()");
  },
}));

vi.mock("@/server/catalog/live", () => ({
  getLiveSeriesList: async () => [],
}));

vi.mock("@/components/layout/Header", () => ({
  Header: () => <header data-testid="header" />,
}));

vi.mock("@/components/layout/Footer", () => ({
  Footer: () => <footer data-testid="footer" />,
}));

vi.mock("@/components/cart/CartProvider", () => ({
  CartProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/cart/CartDrawer", () => ({
  CartDrawer: () => null,
}));

import LocaleLayout from "./layout";

async function renderLayout() {
  const ui = await LocaleLayout({
    children: <main data-testid="page">hello</main>,
    params: Promise.resolve({ locale: "en" }),
  });
  // 布局输出完整的 <html><body>:用服务端渲染 + DOMParser 而不是 RTL 的
  // <div> 容器,避免 React 报 "html cannot be a child of div" 的噪声。
  const markup = renderToStaticMarkup(ui);
  return new DOMParser().parseFromString(`<!doctype html>${markup}`, "text/html");
}

describe("locale layout · JSON-LD", () => {
  it("renders Organization and WebSite exactly once each", async () => {
    const doc = await renderLayout();
    const blocks = [...doc.querySelectorAll('script[type="application/ld+json"]')].map(
      (script) => JSON.parse(script.textContent ?? "") as Record<string, unknown>,
    );

    expect(blocks.map((block) => block["@type"])).toEqual(["Organization", "WebSite"]);
    expect(blocks.filter((block) => block["@type"] === "Organization")).toHaveLength(1);
    expect(blocks.filter((block) => block["@type"] === "WebSite")).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      name: "is.offy",
      logo: expect.stringMatching(/^https?:\/\/.+\/assets\/brand\/is-offy-logo\.png$/),
    });
  });

  it("keeps the page content untouched", async () => {
    const doc = await renderLayout();
    expect(doc.querySelector('[data-testid="page"]')?.textContent).toBe("hello");
    expect(doc.querySelector('[data-testid="header"]')).not.toBeNull();
    expect(doc.querySelector('[data-testid="footer"]')).not.toBeNull();
  });
});
