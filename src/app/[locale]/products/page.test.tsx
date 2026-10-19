import { describe, expect, it, vi } from "vitest";
import en from "../../../../messages/en.json";

/**
 * `/products`(All Looks)metadata 测试。
 *
 * 这个页面此前**没有** `generateMetadata`,于是继承 `[locale]/layout.tsx` 的
 * canonical(首页 `/`),等于向 Google 声称"我是首页的副本" —— 系列/列表页
 * 是最该被独立收录的落地页,却在索引里被合并掉。
 *
 * 页面是 async server component,metadata 里读 headers + 实时商品数据;
 * 这里把数据层与 next-intl 请求上下文换成测试替身(与首页/政策页测试同法)。
 */
const mockState = vi.hoisted(() => ({ locale: "en", count: 30 }));

vi.mock("next-intl/server", async () => {
  const [{ createTranslator }, enModule, zhModule] = await Promise.all([
    import("next-intl"),
    import("../../../../messages/en.json"),
    import("../../../../messages/zh.json"),
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
        messages: dictionaries[mockState.locale as "en" | "zh"],
        namespace: namespace as keyof Messages,
      }),
  };
});

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

vi.mock("@/lib/geo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/geo")>()),
  pickCountry: () => "US",
}));

// 只给 metadata 需要的长度信息;页面渲染路径本测试不触发。
vi.mock("@/server/catalog/live", () => ({
  getLiveProducts: async () =>
    Array.from({ length: mockState.count }, (_, i) => ({ code: `p-${i}` })),
  getLiveSeriesList: async () => [],
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
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

import { generateMetadata } from "./page";

const meta = () => generateMetadata({ params: Promise.resolve({ locale: "en" }) });

describe("/products metadata · self-canonical", () => {
  it("canonical 是自己的 /products,不是首页 /,也不带 /en 前缀", async () => {
    const result = await meta();
    expect(result.alternates?.canonical).toBe("/products");
    expect(result.alternates?.canonical).not.toBe("/");
    expect(result.alternates?.canonical).not.toBe("/en/products");
  });

  it("title 是 All Looks(模板补 | is.offy),不继承首页默认标题", async () => {
    const result = await meta();
    expect(result.title).toBe(en.catalog.title);
    expect(result.title).toBe("All Looks");
  });

  it("description 写实:用当前真实商品数,而不是复制首页那句 tagline", async () => {
    mockState.count = 30;
    const result = await meta();
    expect(result.description).toBe(
      "All 30 OFFY looks across three series — princess, streetwear and dress-up.",
    );
    expect(result.description).not.toBe(en.common.tagline);
  });

  it("description 的数量跟着实时数据走(不是写死的 30)", async () => {
    mockState.count = 37;
    const result = await meta();
    expect(result.description).toContain("All 37 OFFY looks");
    mockState.count = 30; // 复位,避免影响其它用例
  });
});
