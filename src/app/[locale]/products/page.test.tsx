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

  it("uses the approved buying-intent title and page-specific sharing URL", async () => {
    const result = await meta();
    expect(result.title).toEqual({ absolute: "Plush Bag Charms – Shop All OFFY Styles | is.offy" });
    expect(result.openGraph).toMatchObject({
      url: "/products",
      title: "Plush Bag Charms – Shop All OFFY Styles | is.offy",
    });
    expect(result.alternates?.languages).toEqual({ en: "/products" });
  });
  it("describes live bag charm styles without publishing a stale fixed count", async () => {
    mockState.count = 37;
    expect((await meta()).description).toBe(
      "Explore OFFY plush bag charms across Princess, Streetwear and Dress-up styles. Find the curly-haired companion that feels like you.",
    );
    mockState.count = 30;
  });
});
