import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Product } from "@/lib/catalog/types";
import type { ShopifyListItem } from "@/server/shopify/catalog";
import en from "../../../messages/en.json";

/**
 * Homepage editorial bindings and merchandising isolation regression tests.
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
const homeState = vi.hoisted(() => ({
  regionals: [] as ShopifyListItem[],
  newsProducts: [] as Product[],
}));

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
  getLiveProducts: async () => [
    DOLL,
    liveProduct(item("noir", "NOIR"), "outdoor-sporty", 0),
    ...MERCH,
    ...homeState.newsProducts,
  ],
  toLiveProduct: (entry: ShopifyListItem, series: string, sortOrder: number) =>
    liveProduct(entry, series, sortOrder),
  getLiveSeriesList: async () => [
    { slug: "princess-lady", name: { en: "OFFY Princess Series", zh: "公主系列" } },
    { slug: "outdoor-sporty", name: { en: "OFFY Streetwear Series", zh: "街头系列" } },
    { slug: "playful-life", name: { en: "OFFY Dress-up Series", zh: "趣味生活系列" } },
  ],
}));

vi.mock("@/server/catalog/home", () => ({
  getHomeLooks: async () => ({
    source: "newest",
    products: [DOLL],
    regionals: homeState.regionals
      .filter((p) => p.handle === "noir")
      .map((p) => liveProduct(p, "outdoor-sporty", 0)),
  }),
}));

vi.mock("@/server/catalog/regional", () => ({
  getRegionalProducts: async () => homeState.regionals,
}));

import HomePage from "./page";

afterEach(() => {
  homeState.regionals = [];
  homeState.newsProducts = [];
});

async function renderHome(locale: "en" | "zh" = "en") {
  mockState.locale = locale;
  const ui = await HomePage({ params: Promise.resolve({ locale }) });
  return render(ui);
}

describe("homepage NEWS editorial photographs", () => {
  const handles = ["warm-biscuit", "bunny-hug", "ace", "wander", "offy_redrush"];
  const images = ["news-01.jpg", "news-04.jpg", "news-03.jpg", "news-08.jpg", "news-02.jpg"];
  function setNewsProducts(withRemoteImages: boolean) {
    homeState.newsProducts = handles.map((handle, i) => ({
      ...liveProduct(item(handle, `Verified ${handle}`), "princess-lady", i),
      images: withRemoteImages ? [`https://cdn.shopify.com/news-test-${i}.jpg`] : [],
    }));
  }
  it.each([true, false])(
    "keeps all five curated images when Shopify has primary images: %s",
    async (withRemoteImages) => {
      setNewsProducts(withRemoteImages);
      await renderHome();
      const section = screen.getByRole("heading", { name: en.home.newsTitle }).closest("section")!;
      const renderedImages = within(section).getAllByRole("img");
      expect(renderedImages.map((img) => img.getAttribute("src"))).toEqual(
        images.map((file) => `/assets/news/${file}`),
      );
      expect(renderedImages.map((img) => img.closest("a")?.getAttribute("href"))).toEqual(
        handles.map((handle) => `/products/${handle}`),
      );
    },
  );
  it("still hides a card whose bound product is unavailable in the visitor market", async () => {
    setNewsProducts(true);
    homeState.newsProducts[1].isAvailable = false;
    await renderHome();
    const section = screen.getByRole("heading", { name: en.home.newsTitle }).closest("section")!;
    expect(within(section).getAllByRole("img")).toHaveLength(4);
    expect(section.querySelector('a[href="/products/bunny-hug"]')).toBeNull();
  });
});

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

  it("keeps verified doll recommendations and the three original series entry points", async () => {
    const { container } = await renderHome();
    const doll = container.querySelector(`a[href="/products/${DOLL.code}"]`);
    expect(doll).not.toBeNull();
    expect(doll).toHaveTextContent("SWAN QUEEN- LIMITED");
    const navigation = screen.getByRole("navigation", { name: en.home.editSeries });
    expect(
      within(navigation)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual([
      "/collections/princess-lady",
      "/collections/outdoor-sporty",
      "/collections/playful-life",
    ]);
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
