import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Series } from "@/lib/catalog";
import en from "../../../messages/en.json";
import zh from "../../../messages/zh.json";

/**
 * 页脚 HELP & SUPPORT 面板(设计稿改版)渲染测试。
 *
 * Footer 是 async server component,靠 `getTranslations` 取文案;测试里没有
 * next-intl 的请求上下文,所以把 next-intl/server 换成"真字典 + 真 createTranslator"
 * —— key 写错时报错方式与运行时一致,而不是悄悄渲染出 key 名(与 about 页测试同法)。
 *
 * `@/i18n/navigation` 的 Link 换成纯 `<a href>`:这里要断言的正是 href 本身
 * (无 `/en` 前缀),真实 Link 会按 locale 再加工一次,反而看不清源头。
 */
const mockState = vi.hoisted(() => ({ locale: "en" }));

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

import { Footer } from "./Footer";

const testSeries: Series[] = [
  {
    slug: "princess-lady",
    name: { zh: "公主lady系列", en: "OFFY Princess Series" },
    tagline: { zh: "x", en: "x" },
    heroImage: "/assets/hero/hero-02.jpg",
  },
];

async function renderFooter(locale: "en" | "zh") {
  mockState.locale = locale;
  const ui = await Footer({ series: testSeries, locale });
  return render(ui);
}

/** 页脚第 4 栏(HELP & SUPPORT 面板)。按栏目名定位,避免把 MENU / COLLECTIONS 两栏算进来。 */
function panel(container: HTMLElement, heading: string): HTMLElement {
  const nav = [...container.querySelectorAll("nav")].find(
    (el) => el.querySelector(".kicker")?.textContent === heading,
  );
  if (!nav) throw new Error(`footer panel "${heading}" not found`);
  return nav as HTMLElement;
}

describe("Footer · HELP & SUPPORT 面板", () => {
  it("en:栏目名是 Help & Support(大写由 CSS .kicker 负责)", async () => {
    const { container } = await renderFooter("en");
    expect(panel(container, "Help & Support").querySelector(".kicker")?.textContent).toBe(
      "Help & Support",
    );
    expect(en.common.footer.policiesHeading).toBe("Help & Support");
  });

  it("en:只剩 FAQ / Contact Us / Legal & Policies 三个链接,目标分别是 /faq、/policies/contact、/policies", async () => {
    const { container } = await renderFooter("en");
    const nav = panel(container, "Help & Support");

    expect(within(nav).getAllByRole("link")).toHaveLength(3);
    expect(within(nav).getByRole("link", { name: "FAQ" })).toHaveAttribute("href", "/faq");
    expect(within(nav).getByRole("link", { name: "Contact Us" })).toHaveAttribute(
      "href",
      "/policies/contact",
    );
    // 可访问名里不含装饰字符 ›(它是 aria-hidden 的),顺序也如实反映设计稿
    expect(within(nav).getByRole("link", { name: "Legal & Policies" })).toHaveAttribute(
      "href",
      "/policies",
    );
  });

  it("en:4 条政策不再出现在页脚(整页范围内都没有 /policies/<handle> 链接,也没有它们的文案)", async () => {
    const { container } = await renderFooter("en");
    for (const handle of ["returns", "privacy", "terms", "shipping"]) {
      expect(container.querySelector(`a[href="/policies/${handle}"]`)).toBeNull();
    }
    for (const title of [
      "Returns & Refunds",
      "Privacy Policy",
      "Terms of Service",
      "Shipping Policy",
    ]) {
      expect(screen.queryByText(title)).toBeNull();
    }
    // 而 FAQ 与联系信息这两个入口仍在
    expect(screen.getByRole("link", { name: "FAQ" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact Us" })).toBeInTheDocument();
  });

  it("所有站内链接都不带 /en 前缀", async () => {
    const { container } = await renderFooter("en");
    const hrefs = [...container.querySelectorAll("a")].map((a) => a.getAttribute("href") ?? "");
    expect(hrefs.length).toBeGreaterThan(0);
    expect(hrefs.filter((href) => href.startsWith("/en"))).toEqual([]);
  });

  it("三个链接都是可聚焦的真链接,`›` 只是装饰(不进入可访问名)", async () => {
    await renderFooter("en");
    for (const name of ["FAQ", "Contact Us", "Legal & Policies"]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
    const legal = screen.getByRole("link", { name: "Legal & Policies" });
    const decor = legal.querySelector("span");
    // aria-hidden 缺失时屏幕阅读器会把 › 念成 "greater than"
    expect(decor).toHaveAttribute("aria-hidden");
    expect(decor?.textContent).toBe("›");
  });

  it("视觉层级:FAQ / Contact Us 与 MENU 列**同一套排版**,只有 Legal & Policies 更小更弱", async () => {
    const { container } = await renderFooter("en");
    const nav = panel(container, "Help & Support");
    const faq = within(nav).getByRole("link", { name: "FAQ" });
    const contact = within(nav).getByRole("link", { name: "Contact Us" });
    const legal = within(nav).getByRole("link", { name: "Legal & Policies" });

    // 老板诉求 6:面板与左两列完全同一套类(同字号/同字距/同色阶),不再放大成"大字入口"。
    // 比较的是**与 MENU 列首链同类名**,而不是"含 text-cream"这种恒真子串断言
    // (`text-cream/50` 也含子串 `text-cream`,旧的 `toContain("text-cream")` 是假绿)。
    const menuNav = panel(container, "Menu");
    const menuLink = within(menuNav).getAllByRole("link")[0];
    const panelBox = within(nav).getByRole("link", { name: "FAQ" }).parentElement!;
    const menuBox = menuLink.parentElement!;

    expect(faq.className).toBe(menuLink.className);
    expect(contact.className).toBe(menuLink.className);
    expect(panelBox.className).toBe(menuBox.className);
    // 负向对照:旧的"大字入口"排版必须彻底消失
    expect(faq.className).not.toContain("text-lg");
    expect(contact.className).not.toContain("text-lg");
    expect(panelBox.className).not.toContain("items-start");
    expect(faq.className).not.toContain("font-display");

    // 二级入口更小更弱,且用 `/50` 而不是更低的透明度(≈5.21:1,过 AA;`/40` ≈ 3.81:1 不达标)
    expect(legal.className).toContain("text-xs");
    expect(legal.className).toContain("text-cream/50");
    expect(faq.className).not.toContain("text-cream/50");
    // 分隔线是 border 纯样式,不放空的语义元素/图标库
    expect(nav.querySelector("div.border-t")).not.toBeNull();
  });

  it("zh:整栏换成中文文案(栏目名 + 三个入口)", async () => {
    const { container } = await renderFooter("zh");
    const nav = panel(container, "帮助与支持");
    expect(zh.common.footer.policiesHeading).toBe("帮助与支持");
    expect(within(nav).getByRole("link", { name: "常见问题" })).toHaveAttribute("href", "/faq");
    expect(within(nav).getByRole("link", { name: "联系我们" })).toHaveAttribute(
      "href",
      "/policies/contact",
    );
    expect(within(nav).getByRole("link", { name: "法律与政策" })).toHaveAttribute(
      "href",
      "/policies",
    );
  });
});
