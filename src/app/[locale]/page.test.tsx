import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Product } from "@/lib/catalog/types";
import type { ShopifyListItem } from "@/server/shopify/catalog";
import en from "../../../messages/en.json";

/**
 * 首页 · 名册(All Products)不含 merch 的回归测试。
 *
 * 老板 2026-10 决策:贴纸 / 帆布包这类**不属于任何系列**的商品只在 All Looks
 * (/products)展示,并且排在最后;首页的「All Products 名册」用的是**同一个数据源**
 * (`getLiveProducts`),所以必须在首页这一层按 `series === "merch"` 过滤掉。
 *
 * 页面是 async server component,依赖 headers() / Shopify 数据层 / next-intl 请求
 * 上下文,故把这几样换成测试替身(与 PDP、about、cart 页测试同法)。
 */
const mockState = vi.hoisted(() => ({ locale: "en" as "en" | "zh" }));

vi.mock("next-intl/server", async () => {
  const [{ createTranslator }, enModule, zhModule] = await Promise.all([
    import("next-intl"),
    import("../../../messages/en.json"),
    import("../../../messages/zh.json"),
  ]);
  type Messages = typeof en;
  const dictionaries: Record<"en" | "zh", Messages> = {
    en: enModule.default,
    zh: zhModule.default,
  };
  return {
    getTranslations: async (namespace: string) =>
      createTranslator({
        locale: mockState.locale,
        messages: dictionaries[mockState.locale],
        namespace: namespace as keyof Messages,
      }),
  };
});

vi.mock("next-intl", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next-intl")>()),
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

// ProductCard 还要用 geo 里的徽章文案(区域限定),这里只覆盖访客国家解析。
vi.mock("@/lib/geo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/geo")>()),
  pickCountry: () => "US",
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...rest
  }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={typeof src === "string" ? src : ""} />
  ),
}));

/** 数据层替身:名册(含 3 款周边)+ 空的最新造型 + 可切换的区域限定。 */
const homeState = vi.hoisted(() => ({ regionals: [] as ShopifyListItem[] }));

function liveProduct(item: ShopifyListItem, series: string, sortOrder: number): Product {
  return {
    code: item.handle,
    slug: item.handle,
    series: series as Product["series"],
    name: { en: item.title, zh: item.title },
    description: { en: "", zh: "" },
    priceCents: item.priceCents,
    currency: item.currency,
    dimensions: null,
    images: item.image ? [item.image] : ["/assets/hero/hero-01.jpg"],
    emotionTags: { en: [], zh: [] },
    featured: false,
    isAvailable: item.available,
    isUpcoming: false,
    isQuoteOnly: false,
    sortOrder,
  };
}

const item = (handle: string, title: string, priceCents = 4990): ShopifyListItem => ({
  handle,
  title,
  priceCents,
  currency: "USD",
  image: `/assets/p/${handle}.jpg`,
  available: true,
});

// 有系列的:公主系列公仔(必须在名册里 —— 过滤不能把公仔一起干掉)
const DOLL = liveProduct(item("swan-princess", "SWAN QUEEN- LIMITED", 0), "princess-lady", 0);
// 不属于任何系列的周边:线上实测两款 + 一款"未来才上架"的假想款,
// 用来证明过滤是按 series,而不是按 handle 硬编码名单。
const MERCH = [
  liveProduct(item("offy-tote-bag", "BUY 3 OFFY, GET A FREE TOTE BAG", 2000), "merch", 0),
  liveProduct(item("offy-sticker-sheet", "BUY ANY OFFY, GET A FREE STICKER", 100), "merch", 10),
  liveProduct(item("mystery-mug", "MYSTERY MUG", 1200), "merch", 20),
];

vi.mock("@/server/catalog/live", () => ({
  getLiveNewLooksProducts: async () => [],
  getLiveProducts: async () => [DOLL, ...MERCH],
  toLiveProduct: (entry: ShopifyListItem, series: string, sortOrder: number) =>
    liveProduct(entry, series, sortOrder),
}));

vi.mock("@/server/catalog/regional", () => ({
  getRegionalProducts: async () => homeState.regionals,
}));

import HomePage from "./page";

afterEach(() => {
  homeState.regionals = [];
});

async function renderHome(locale: "en" | "zh" = "en") {
  mockState.locale = locale;
  const ui = await HomePage({ params: Promise.resolve({ locale }) });
  return render(ui);
}

describe("首页 · 语义 H1", () => {
  it("有且只有一个 h1,且是 sr-only(头图文字烧在图片里,语义层补标题 / 视觉零变化)", async () => {
    const { container } = await renderHome();
    const h1s = container.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    const h1 = h1s[0] as HTMLHeadingElement;
    expect(h1).toHaveClass("sr-only");
    expect(h1.textContent).toBe(en.common.tagline);
  });
});

describe("首页 · 名册不含 merch", () => {
  it("名册里没有贴纸 / 帆布包(只在 All Looks 展示)", async () => {
    const { container } = await renderHome();
    for (const product of MERCH) {
      expect(container.querySelector(`a[href="/products/${product.code}"]`)).toBeNull();
    }
  });

  it("过滤按 series === merch,未来新增的周边商品也自动排除", async () => {
    await renderHome();
    expect(screen.queryByTitle("MYSTERY MUG")).toBeNull();
  });

  it("公仔仍然一个不少地在名册里(过滤没有误伤)", async () => {
    const { container } = await renderHome();
    const doll = container.querySelector(`a[href="/products/${DOLL.code}"]`);
    expect(doll).not.toBeNull();
    expect(doll).toHaveAttribute("title", "SWAN QUEEN- LIMITED");
  });

  it("区域限定区块也不展示周边(即使某款周边只在单一市场上架)", async () => {
    // 区域限定的判定与名册是两条路径,这里同样兜住:周边不该借区域限定回到首页。
    homeState.regionals = [
      item("offy-tote-bag", "BUY 3 OFFY, GET A FREE TOTE BAG", 2000),
      item("noir", "NOIR", 4500),
    ];
    const { container } = await renderHome();

    expect(container.querySelector('a[href="/products/offy-tote-bag"]')).toBeNull();
    // 区域限定的其它公仔不受影响(这一块仍要正常渲染)
    expect(container.querySelector('a[href="/products/noir"]')).not.toBeNull();
  });
});
