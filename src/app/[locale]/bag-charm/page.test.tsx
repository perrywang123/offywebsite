import { describe, expect, it, vi } from "vitest";

/**
 * `/bag-charm`(时尚包挂预告)metadata 测试 —— 此前没有自己的 generateMetadata,
 * canonical 继承首页 `/`,等于告诉 Google 这一页是首页副本。
 */
vi.mock("next-intl/server", async () => {
  const [{ createTranslator }, enModule, zhModule] = await Promise.all([
    import("next-intl"),
    import("../../../../messages/en.json"),
    import("../../../../messages/zh.json"),
  ]);
  type Messages = typeof enModule.default;
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

describe("/bag-charm metadata · self-canonical", () => {
  it("canonical 是自己的 /bag-charm,不是首页 /", async () => {
    const result = await meta();
    expect(result.alternates?.canonical).toBe("/bag-charm");
  });

  it("explicitly calls this an upcoming preview rather than live inventory", async () => {
    const result = await meta();
    expect(result.title).toEqual({ absolute: "Upcoming OFFY Bag Charm Collection | is.offy" });
    expect(result.description).toContain("upcoming bag charm collection");
    expect(result.openGraph).toMatchObject({ url: "/bag-charm" });
  });
});
