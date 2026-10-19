import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";

/**
 * `/collections/<series>` metadata 测试。
 *
 * 系列页是最该被搜到的电商落地页,此前却因继承 layout 的 canonical 被
 * Google 当成首页副本。这里除了 canonical,还钉住两件事:
 *   · title 用 **getLiveSeriesList() 查到的真实系列名**(不是写死字符串);
 *   · description 用该系列的 tagline(数据源 `lib/catalog/series.ts`)。
 */
const mockState = vi.hoisted(() => ({ liveName: null as string | null }));

// 其它模块的 import 与页面共用同一份 mock(metadata 不渲染组件)。
vi.mock("next-intl/server", async () => {
  const [{ createTranslator }, enModule, zhModule] = await Promise.all([
    import("next-intl"),
    import("../../../../../messages/en.json"),
    import("../../../../../messages/zh.json"),
  ]);
  type Messages = (typeof enModule)["default"];
  const dictionaries: Record<"en" | "zh", Messages> = {
    en: enModule.default,
    zh: zhModule.default,
  };
  return {
    getTranslations: async (namespace: string) =>
      createTranslator({
        locale: "en",
        messages: dictionaries.en,
        namespace: namespace as keyof Messages,
      }),
  };
});

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

vi.mock("@/lib/geo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/geo")>()),
  pickCountry: () => "US",
}));

vi.mock("@/server/catalog/live", async () => {
  const { seriesList } = await import("@/lib/catalog/series");
  return {
    getLiveSeriesList: async () =>
      seriesList.map((s) =>
        s.slug === "outdoor-sporty" && mockState.liveName
          ? { ...s, name: { ...s.name, en: mockState.liveName } }
          : s,
      ),
    getLiveProductsBySeries: async () => [],
  };
});

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// 系列页正文的 ProductGrid 是 async server component,React 的测试渲染器不接受
// async 客户端组件;本测试只关心 breadcrumb script,用空网格替身。
vi.mock("@/components/product/ProductGrid", () => ({
  ProductGrid: () => <div data-testid="product-grid" />,
}));

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={typeof src === "string" ? src : ""} />
  ),
}));

import SeriesPage, { generateMetadata } from "./page";

const meta = (series: string) =>
  generateMetadata({ params: Promise.resolve({ locale: "en", series }) });

describe("/collections/<series> metadata · self-canonical", () => {
  it("canonical 是当前系列自己的路径,不是首页 /", async () => {
    expect((await meta("outdoor-sporty")).alternates?.canonical).toBe(
      "/collections/outdoor-sporty",
    );
    expect((await meta("playful-life")).alternates?.canonical).toBe("/collections/playful-life");
  });

  it("title = 真实系列名,description = 该系列 tagline", async () => {
    const result = await meta("outdoor-sporty");
    expect(result.title).toBe("Fashion Lifestyle");
    expect(result.description).toBe("Weekend in motion");
  });

  it("不同系列各用自己的名字/tagline(不是一份写死的文案)", async () => {
    const result = await meta("playful-life");
    expect(result.title).toBe("Playful Life");
    expect(result.description).toBe("Too cute to dress normal");
  });

  it("系列名来自 getLiveSeriesList 的实时值,商家在 Shopify 改名后 metadata 跟着变", async () => {
    mockState.liveName = "Streetwear Series";
    const result = await meta("outdoor-sporty");
    expect(result.title).toBe("Streetwear Series");
    mockState.liveName = null;
  });

  it("查不到的 slug 退回 Series,canonical 仍指该路径(页面本身会 404)", async () => {
    const result = await meta("does-not-exist");
    expect(result.title).toBe("Series");
    expect(result.alternates?.canonical).toBe("/collections/does-not-exist");
  });
});

/**
 * 第 2 批 SEO · 系列页 BreadcrumbList。
 *
 * `Home > Series > <系列名>`,每级 position 从 1 开始、item 是绝对 URL。
 * 系列名取渲染页面用的同一份实时名(不是 slug、也不是写死的英文名)。
 */
describe("/collections/<series> · JSON-LD(BreadcrumbList)", () => {
  const SITE_URL = env.SITE_URL.replace(/\/+$/, "");

  it("输出 Home > Series > 系列名,item 全绝对 URL", async () => {
    const ui = await SeriesPage({
      params: Promise.resolve({ locale: "en", series: "outdoor-sporty" }),
    });
    const { container } = render(ui);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const ld = JSON.parse(script?.textContent ?? "") as Record<string, unknown>;

    expect(ld).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        {
          "@type": "ListItem",
          position: 2,
          name: "Series",
          item: `${SITE_URL}/collections`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Fashion Lifestyle",
          item: `${SITE_URL}/collections/outdoor-sporty`,
        },
      ],
    });
  });

  it("加了 script 之后页面可见内容不变:仍有系列 h1 与分类 tab", async () => {
    const ui = await SeriesPage({
      params: Promise.resolve({ locale: "en", series: "playful-life" }),
    });
    const { container, getByRole } = render(ui);

    expect(getByRole("heading", { level: 1, name: "Playful Life" })).toBeInTheDocument();
    expect(container.querySelector('[role="tablist"]')).not.toBeNull();
    // script 之外没有多出可见元素:首屏第一个可见节点仍是分类 tab 条
    expect(container.querySelector("script")?.nextElementSibling).toBe(
      container.querySelector('[role="tablist"]'),
    );
  });
});
