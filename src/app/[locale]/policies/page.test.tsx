import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import en from "../../../../messages/en.json";
import zh from "../../../../messages/zh.json";

/**
 * 二级页 `/policies`(法律与政策目录)渲染测试。
 *
 * 页面是 async server component,靠 `getTranslations` 取文案;测试里没有 next-intl 的
 * 请求上下文,所以把 next-intl/server 换成"真字典 + 真 createTranslator"(与 about 页
 * 测试同法),key 写错时报错方式与运行时一致。
 *
 * `@/i18n/navigation` 的 Link 换成纯 `<a href>`:这里要断言的正是 href 本身。
 */
const mockState = vi.hoisted(() => ({ locale: "en" }));

vi.mock("next-intl/server", async () => {
  const [{ createTranslator }, enModule, zhModule] = await Promise.all([
    import("next-intl"),
    import("../../../../messages/en.json"),
    import("../../../../messages/zh.json"),
  ]);
  type Messages = typeof en;
  const dictionaries: Record<"en" | "zh", Messages> = { en: enModule.default, zh: zhModule.default };
  return {
    getTranslations: async (namespace: string) =>
      createTranslator({
        locale: mockState.locale,
        messages: dictionaries[mockState.locale as "en" | "zh"],
        namespace: namespace as keyof Messages,
      }),
  };
});

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

import PoliciesIndexPage, { generateMetadata } from "./page";

async function renderIndex(locale: "en" | "zh") {
  mockState.locale = locale;
  const ui = await PoliciesIndexPage();
  return render(ui);
}

describe("/policies 二级页", () => {
  it("en:标题是 Legal & Policies,列出 4 条政策并链到各自正文页", async () => {
    await renderIndex("en");
    expect(screen.getByRole("heading", { level: 1, name: "Legal & Policies" })).toBeInTheDocument();

    const links = screen.getAllByRole("link").filter((a) => a.getAttribute("href")?.startsWith("/policies/"));
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/policies/returns",
      "/policies/privacy",
      "/policies/terms",
      "/policies/shipping",
    ]);
    for (const title of ["Returns & Refunds", "Privacy Policy", "Terms of Service", "Shipping Policy"]) {
      expect(screen.getByRole("link", { name: new RegExp(`^${title}`) })).toBeInTheDocument();
    }
  });

  it("en:不含 Contact(联系信息在页脚就是独立大入口,不再从这一层进一次)", async () => {
    const { container } = await renderIndex("en");
    expect(container.querySelector('a[href="/policies/contact"]')).toBeNull();
    expect([...container.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual([
      "/policies/returns",
      "/policies/privacy",
      "/policies/terms",
      "/policies/shipping",
      "/",
    ]);
    expect(screen.queryByText("Contact Information")).toBeNull();
    expect(screen.queryByText("Contact Us")).toBeNull();
  });

  it("所有链接都不带 /en 前缀,返回首页用相对路径", async () => {
    const { container } = await renderIndex("en");
    const hrefs = [...container.querySelectorAll("a")].map((a) => a.getAttribute("href") ?? "");
    expect(hrefs).toContain("/");
    expect(hrefs.filter((href) => href.startsWith("/en"))).toEqual([]);
  });

  it("装饰箭头 aria-hidden,不污染链接的可访问名", async () => {
    await renderIndex("en");
    const link = screen.getByRole("link", { name: "Privacy Policy" });
    const decor = link.querySelector("span");
    expect(decor).toHaveAttribute("aria-hidden");
    expect(decor?.textContent).toBe("→");
  });

  it("zh:标题与 4 条政策名都是中文(复用 policies.titles.*,不另建一套文案)", async () => {
    await renderIndex("zh");
    expect(screen.getByRole("heading", { level: 1, name: "法律与政策" })).toBeInTheDocument();
    for (const key of ["returns", "privacy", "terms", "shipping"] as const) {
      expect(zh.policies.titles[key]).not.toBe(en.policies.titles[key]);
      expect(screen.getByRole("link", { name: zh.policies.titles[key] })).toHaveAttribute(
        "href",
        `/policies/${key}`,
      );
    }
  });

  it("metadata:title/description 来自字典,canonical 是 /policies(无 /en 前缀)", async () => {
    mockState.locale = "en";
    const meta = await generateMetadata({ params: Promise.resolve({ locale: "en" }) });
    expect(meta.title).toBe(en.policies.legalLabel);
    expect(meta.description).toBe(en.policies.indexDescription);
    expect(meta.alternates?.canonical).toBe("/policies");
  });
});
