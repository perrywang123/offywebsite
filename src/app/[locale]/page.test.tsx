import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Product } from "@/lib/catalog/types";
import type { ShopifyListItem } from "@/server/shopify/catalog";
import type { HomeContent } from "@/lib/home-content";
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
  useLocale: () => mockState.locale,
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
  launches: new Map<string, Product>(),
  content: null as HomeContent | null,
}));

vi.mock("@/server/home-content/store", async () => {
  const { defaultHomeContent } = await import("@/lib/home-content");
  return { getPublishedHomeContent: () => homeState.content ?? defaultHomeContent() };
});

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
const DOLL = liveProduct(item("little-heiress", "LITTLE HEIRESS", 0), "princess-lady", 0);
// 不属于任何系列的周边:线上实测两款 + 一款"未来才上架"的假想款,
// 用来证明过滤是按 series,而不是按 handle 硬编码名单。
const MERCH = [
  liveProduct(item("offy-tote-bag", "BUY 3 OFFY, GET A FREE TOTE BAG", 2000), "merch", 0),
  liveProduct(item("offy-sticker-sheet", "BUY ANY OFFY, GET A FREE STICKER", 100), "merch", 10),
  liveProduct(item("mystery-mug", "MYSTERY MUG", 1200), "merch", 20),
];

vi.mock("@/server/catalog/live", () => ({
  getLiveProductByCode: async (handle: string) => homeState.launches.get(handle),
  getLiveNewLooksProducts: async () => [],
  getLiveProducts: async () => [
    DOLL,
    liveProduct(item("noir", "NOIR"), "outdoor-sporty", 0),
    ...MERCH,
    ...homeState.newsProducts,
  ],
  toLiveProduct: (entry: ShopifyListItem, series: string, sortOrder: number) =>
    liveProduct(entry, series, sortOrder),
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
import { defaultHomeContent } from "@/lib/home-content";

afterEach(() => {
  homeState.regionals = [];
  homeState.newsProducts = [];
  homeState.launches.clear();
  homeState.content = null;
});

async function renderHome(locale: "en" | "zh" = "en") {
  mockState.locale = locale;
  const ui = await HomePage({ params: Promise.resolve({ locale }) });
  return render(ui);
}

describe("homepage NEWS editorial photographs", () => {
  it("shows the release from the Shopify product route even when the product is absent from listings", async () => {
    const content = defaultHomeContent();
    content.latest.items[0].href = "/products/unlisted-preview";
    content.latest.items[0].comingSoon = true;
    homeState.content = content;
    const releaseAt = "2099-11-30T18:00:00.000Z";
    homeState.launches.set("unlisted-preview", {
      ...DOLL,
      isAvailable: false,
      isUpcoming: true,
      releaseAt,
    });
    await renderHome();
    const section = screen.getByRole("heading", { name: en.home.newsTitle }).closest("section")!;
    const preview = section.querySelector('a[href="/products/unlisted-preview"]')!;
    expect(preview.querySelector("time")).toHaveAttribute("dateTime", releaseAt);
    expect(preview.querySelector("time")).toHaveTextContent(/Nov 30.*1:00\s*PM EST/);
    expect(within(section).getAllByRole("img")).toHaveLength(5);
  });

  const handles = ["swan-princess", "bunny-hug", "ace", "wander", "offy_redrush"];
  const images = [
    "news-swan-queen.jpg",
    "news-04.jpg",
    "news-03.jpg",
    "news-08.jpg",
    "news-02.jpg",
  ];
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
  it("keeps the ACE card when its product is missing and another product is unavailable", async () => {
    setNewsProducts(true);
    homeState.newsProducts = homeState.newsProducts.filter((product) => product.code !== "ace");
    homeState.newsProducts[1].isAvailable = false;
    await renderHome();
    const section = screen.getByRole("heading", { name: en.home.newsTitle }).closest("section")!;
    const renderedImages = within(section).getAllByRole("img");
    expect(renderedImages.map((image) => image.getAttribute("src"))).toEqual(
      images.map((file) => `/assets/news/${file}`),
    );
    expect(
      within(section).getByRole("img", { name: "Weekend in Motion" }).closest("a"),
    ).toHaveAttribute("href", "/products/ace");
  });
  it("uses the verified Swan Queen name as alternative text without the old visible headline", async () => {
    setNewsProducts(true);
    const name = "BUY 6 OFFY, GET A FREE LIMITED-EDITION SWAN QUEEN";
    homeState.newsProducts[0].name = { en: name, zh: name };
    await renderHome();
    const section = screen.getByRole("heading", { name: en.home.newsTitle }).closest("section")!;
    const image = within(section).getByRole("img", { name });
    expect(image.closest("a")).toHaveAttribute("href", "/products/swan-princess");
    expect(within(image.closest("a")!).getByText(en.home.teaserCta)).toBeVisible();
    expect(within(section).queryByText(en.home.newsFeatureTitle)).toBeNull();
    expect(within(section).queryByRole("heading", { level: 3 })).toBeNull();
  });
  it.each(["missing", "unavailable"])(
    "keeps all five cards when the Swan Queen product is %s",
    async (state) => {
      setNewsProducts(true);
      if (state === "missing") homeState.newsProducts.shift();
      else homeState.newsProducts[0].isAvailable = false;
      homeState.newsProducts.push(
        liveProduct(item("warm-biscuit", "CARAMEL RÊVE"), "princess-lady", 10),
      );
      await renderHome();
      const section = screen.getByRole("heading", { name: en.home.newsTitle }).closest("section")!;
      const renderedImages = within(section).getAllByRole("img");
      expect(renderedImages).toHaveLength(5);
      expect(renderedImages[0]).toHaveAttribute("src", "/assets/news/news-swan-queen.jpg");
      expect(renderedImages[0].closest("a")).toHaveAttribute("href", "/products/swan-princess");
    },
  );
  it("renders uploaded banners and every configured Latest link", async () => {
    const content = defaultHomeContent();
    homeState.content = content;
    content.hero[0] = {
      ...content.hero[0],
      image: `/api/home-media/${"b".repeat(64)}`,
      href: "/collections?drop=holiday",
      alt: "Holiday campaign",
      enabled: true,
    };
    content.hero[1].enabled = false;
    content.latest.feature = {
      image: "/assets/news/news-02.jpg",
      href: "/about",
      alt: "Offy story",
    };
    content.latest.items[0].href = "https://example.com/collaboration";
    content.latest.items[1].href = "/products/unpublished?campaign=holiday";
    content.latest.browseHref = "/collections";

    const { container } = await renderHome();
    const hero = screen.getByRole("img", { name: "Holiday campaign" });
    expect(hero).toHaveAttribute("src", content.hero[0].image);
    expect(hero.closest("a")).toHaveAttribute("href", "/collections?drop=holiday");
    expect(container.querySelectorAll("[data-hero-slide]")).toHaveLength(4);
    const news = screen.getByRole("heading", { name: en.home.newsTitle }).closest("section")!;
    expect(within(news).getByRole("link", { name: en.home.browseAll })).toHaveAttribute(
      "href",
      "/collections",
    );
    expect(within(news).getByRole("img", { name: "Offy story" }).closest("a")).toHaveAttribute(
      "href",
      "/about",
    );
    expect(news.querySelector('a[href="https://example.com/collaboration"]')).toBeVisible();
    expect(news.querySelector('a[href="/products/unpublished?campaign=holiday"]')).toBeVisible();
    expect(within(news).getAllByRole("img")).toHaveLength(5);
  });
});

it.each([0, 1, 7])("renders a published hero with %s enabled banners", async (count) => {
  const content = defaultHomeContent();
  content.hero = [
    ...Array.from({ length: count }, (_, index) => ({
      id: `new-${index}`,
      image: `/assets/hero/banner-${index}.jpg`,
      href: `/about?banner=${index}`,
      alt: `Banner ${index}`,
      enabled: true,
    })),
    { ...content.hero[0], enabled: false },
  ];
  homeState.content = content;
  const { container } = await renderHome();
  const slides = [...container.querySelectorAll("[data-hero-slide]")];
  expect(slides).toHaveLength(count);
  expect(slides.map((slide) => slide.querySelector("a")?.getAttribute("href"))).toEqual(
    Array.from({ length: count }, (_, index) => `/about?banner=${index}`),
  );
  expect(screen.queryAllByRole("tab")).toHaveLength(count > 1 ? count : 0);
  expect(screen.getByRole("heading", { name: en.home.newsTitle })).toBeVisible();
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

  it("restores every verified non-merch thumbnail in All Products after FEATURED", async () => {
    homeState.newsProducts = Array.from({ length: 8 }, (_, i) =>
      liveProduct(item(`extra-${i}`, `Extra ${i}`), "princess-lady", i),
    );
    await renderHome();
    const roster = screen.getByRole("region", { name: en.home.rosterTitle });
    expect(within(roster).getAllByRole("link")).toHaveLength(10);
    expect(within(roster).getByRole("link", { name: /Extra 7/ })).toHaveAttribute(
      "href",
      "/products/extra-7",
    );
    expect(within(roster).getAllByRole("img")[0].parentElement).toHaveClass("rounded-full");
    expect(within(roster).queryByText("MYSTERY MUG")).toBeNull();
    expect(screen.getByRole("heading", { name: en.home.featuredTitle, level: 3 })).toBeVisible();
    expect(screen.getByRole("heading", { name: en.home.categoryTitle, level: 2 })).toBeVisible();
    expect(screen.queryByRole("navigation", { name: en.home.editSeries })).toBeNull();
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
