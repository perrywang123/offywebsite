import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Product, Series } from "@/lib/catalog/types";
import en from "../../../../../messages/en.json";
/**
 * PDP(商品详情页)· 老板优化诉求 4 的回归测试。
 *
 * 诉求:去掉图区主图下方那排**同系列其它商品**的小图(每张带常显商品名),
 * 它与页尾「More from this series」网格是同一批 `siblings.slice(0, 6)` 的重复渲染。
 *
 * 关键护栏(两条,方向相反,不能只测一头):
 *  ① 那排 `a.hscroll` 必须消失 —— 这是本次要删的;
 *  ② `ProductGallery`(本商品**自己的**图集,缩略图是 `<button>` 切图,无可见文字)
 *     必须保留 —— 若误判方向把它一起删了,主图切换能力就真丢了。
 *
 * 页面是 async server component,依赖 headers() / Shopify 数据层 / next-intl 请求
 * 上下文,故把这三样都换成测试替身(与 about、cart 页测试同法)。
 */
const mockState = vi.hoisted(() => ({ locale: "en" as "en" | "zh" }));

vi.mock("next-intl/server", async () => {
  const [{ createTranslator }, enModule, zhModule] = await Promise.all([
    import("next-intl"),
    import("../../../../../messages/en.json"),
    import("../../../../../messages/zh.json"),
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

// 客户端子组件(AddToCartButton / StickyBuyBar)用 useTranslations;
// 上面 next-intl/server 的替身工厂又需要真的 createTranslator,所以这里只覆盖
// useTranslations,其余原样放行。
vi.mock("next-intl", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next-intl")>()),
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound()");
  },
  permanentRedirect: (url: string) => {
    throw new Error(`permanentRedirect(${url})`);
  },
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

vi.mock("@/components/cart/CartProvider", () => ({
  useCart: () => ({ add: vi.fn(), lines: [], catalog: {}, catalogLoaded: true }),
}));

// 数据层与访客国家解析都换成固定值:本测试只关心"渲染出什么",不关心 Shopify。
const CURRENT: Product = {
  code: "lady-pearl",
  slug: "lady-pearl",
  series: "playful-life",
  name: { en: "LADY PEARL", zh: "珍珠小姐" },
  description: { en: "A tiny pearl.", zh: "一颗小珍珠。" },
  priceCents: 4990,
  currency: "USD",
  dimensions: null,
  // 本商品自己的图集:3 张图 → ProductGallery 必须渲染 3 个切换按钮
  images: [
    "/assets/p/lady-pearl-1.jpg",
    "/assets/p/lady-pearl-2.jpg",
    "/assets/p/lady-pearl-3.jpg",
  ],
  emotionTags: { en: [], zh: [] },
  featured: false,
  isAvailable: true,
  isUpcoming: false,
  isQuoteOnly: false,
  sortOrder: 0,
};

const SIBLINGS: Product[] = ["prep-school", "madame-wild", "diva", "glow", "mori", "extra-one"].map(
  (code, i) => ({
    ...CURRENT,
    code,
    slug: code,
    name: { en: code.toUpperCase(), zh: code },
    images: [`/assets/p/${code}-1.jpg`],
    sortOrder: i + 1,
  }),
);

const SERIES: Series[] = [
  {
    slug: "playful-life",
    name: { en: "Playful Life", zh: "趣味生活系列" },
    tagline: { en: "x", zh: "x" },
    heroImage: "/assets/hero/hero-playful.jpg",
  },
];

vi.mock("@/server/catalog/live", () => ({
  getLiveProductByCode: async () => CURRENT,
  getLiveProductsBySeries: async () => SIBLINGS,
  getLiveSeriesList: async () => SERIES,
}));

vi.mock("@/lib/geo", () => ({
  pickCountry: () => "US",
}));

import ProductDetailPage from "./page";

async function renderPdp(locale: "en" | "zh" = "en") {
  mockState.locale = locale;
  const ui = await ProductDetailPage({ params: Promise.resolve({ locale, code: CURRENT.code }) });
  return render(ui);
}

describe("PDP · 同系列小图条已移除(诉求 4)", () => {
  it("图区里不再有 `.hscroll` 横滑条(那排带商品名的同系列小图)", async () => {
    const { container } = await renderPdp();
    expect(container.querySelectorAll("a.hscroll")).toHaveLength(0);
    expect(container.querySelectorAll(".hscroll a")).toHaveLength(0);
  });

  it("同系列商品名不再出现在图区小图条里(页尾 More 网格仍保留 6 张卡)", async () => {
    const { container } = await renderPdp();
    // 页尾网格:每款一张卡,名字是 <p>,链接是裸 <a>(不带 .hscroll)
    const moreLinks = [...container.querySelectorAll(`a[href="/products/prep-school"]`)];
    expect(moreLinks.length).toBeGreaterThan(0);
    // 图区那条每条都是 `a.hscroll` 的子元素(<span> 里嵌 <img>),已随该容器一起消失
    for (const link of moreLinks) {
      expect(link.closest(".hscroll")).toBeNull();
    }
  });

  it("本商品自己的图集(ProductGallery)不受影响:3 张图 = 3 个切换按钮,可切主图", async () => {
    const { container } = await renderPdp();
    // 图集缩略图是按钮(切同一件商品的不同图),不是链接
    const galleryButtons = [...container.querySelectorAll('button[aria-label^="LADY PEARL "]')];
    expect(galleryButtons).toHaveLength(CURRENT.images.length);
    expect(galleryButtons[0]).toHaveAttribute("aria-current", "true");
    // 主图当前是 images[0]
    expect(screen.getByAltText("LADY PEARL")).toHaveAttribute("src", CURRENT.images[0]);
  });

  it("页尾「More from this series」网格仍在,卡片数 = min(siblings.length, 6)", async () => {
    const { container } = await renderPdp();
    const grid = container.querySelector("section.mt-10 .grid, section.mt-10 .md\\:mt-20 .grid");
    expect(grid).not.toBeNull();
    const cards = [...(grid?.querySelectorAll("a[href^='/products/']") ?? [])];
    expect(cards).toHaveLength(Math.min(SIBLINGS.length, 6));
    expect(cards.map((a) => a.getAttribute("href"))).toContain("/products/madame-wild");
  });

  it("面包屑 / 加购按钮等其它入口未被误伤", async () => {
    await renderPdp();
    expect(screen.getByRole("heading", { level: 1, name: "LADY PEARL" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Playful Life/ })).toHaveAttribute(
      "href",
      "/collections/playful-life",
    );
  });
});
