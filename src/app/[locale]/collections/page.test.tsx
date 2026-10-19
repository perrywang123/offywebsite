import { describe, expect, it, vi } from "vitest";
import en from "../../../../messages/en.json";

/**
 * `/collections`(系列目录)metadata 测试 —— 此前没有自己的 generateMetadata,
 * canonical 继承首页 `/`,在 Google 眼里是首页的副本。
 */
const mockState = vi.hoisted(() => ({ locale: "en" }));

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

vi.mock("@/server/catalog/live", () => ({
  getLiveSeriesList: async () => [],
  getLiveProductsBySeries: async () => [],
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

describe("/collections metadata · self-canonical", () => {
  it("canonical 是自己的 /collections,不是首页 /", async () => {
    const result = await meta();
    expect(result.alternates?.canonical).toBe("/collections");
  });

  it("title 是 Series,description 写实描述三个系列", async () => {
    const result = await meta();
    expect(result.title).toBe("Series");
    expect(result.description).toBe("Three OFFY series: princess, streetwear and dress-up.");
    expect(result.description).not.toBe(en.common.tagline);
  });
});
