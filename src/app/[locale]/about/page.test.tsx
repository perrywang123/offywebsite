import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import en from "../../../../messages/en.json";
import zh from "../../../../messages/zh.json";

/**
 * About 页(OUR STORY 表改版)渲染测试。
 *
 * 页面是 async server component,靠 `getTranslations` 取文案;测试里没有 next-intl 的
 * 请求上下文,所以把 next-intl/server 换成"真字典 + 真 createTranslator" —— key 写错
 * 或数组用错时,报错方式与运行时一致,而不是悄悄渲染出 key 名。
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
        // 页面按命名空间字符串取文案;这里不复制那串受约束的命名空间联合类型
        namespace: namespace as keyof Messages,
      }),
  };
});

import AboutPage from "./page";

function flatten(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? flatten(value as Record<string, unknown>, path)
      : [path];
  });
}

async function renderAbout(locale: "en" | "zh") {
  mockState.locale = locale;
  const ui = await AboutPage({ params: Promise.resolve({ locale }) });
  return render(ui);
}

describe("About 页 · OUR STORY 表改版", () => {
  describe("row 3 页首", () => {
    it("en:主标语换成 Meet Who You Love to Be,原标语降为副行", async () => {
      await renderAbout("en");
      expect(screen.getByRole("heading", { level: 1, name: "Meet Who You Love to Be" })).toBeInTheDocument();
      expect(screen.getByText("Imagine with Love. Create with Companion.")).toBeInTheDocument();
    });

    it("zh:两行都是中文,且主标语与英文不同", async () => {
      await renderAbout("zh");
      expect(screen.getByRole("heading", { level: 1, name: zh.about.title })).toBeInTheDocument();
      expect(screen.getByText(zh.about.tagline)).toBeInTheDocument();
      expect(zh.about.title).not.toBe(en.about.title);
    });
  });

  describe("row 4 Where She Came From 正文", () => {
    it("标题保留,12 段新正文按顺序全部渲染,图集还在", async () => {
      const { container } = await renderAbout("en");
      expect(screen.getByRole("heading", { level: 2, name: "Where She Came From" })).toBeInTheDocument();
      expect(en.about.storyParagraphs).toHaveLength(12);
      for (const paragraph of en.about.storyParagraphs) {
        expect(screen.getByText(paragraph)).toBeInTheDocument();
      }
      expect(container.querySelector('[data-slot="story-image"]')).not.toBeNull();
    });

    it("旧的三段塞尔达起源文案不再出现", async () => {
      await renderAbout("en");
      expect(screen.queryByText(/Korok/)).toBeNull();
      expect(screen.queryByText(/die-hard Zelda/)).toBeNull();
    });

    it("zh:12 段一一对应中文,不留英文原文", async () => {
      await renderAbout("zh");
      expect(zh.about.storyParagraphs).toHaveLength(en.about.storyParagraphs.length);
      for (const paragraph of zh.about.storyParagraphs) {
        expect(screen.getByText(paragraph)).toBeInTheDocument();
      }
      for (const paragraph of en.about.storyParagraphs) {
        expect(screen.queryByText(paragraph)).toBeNull();
      }
    });
  });

  describe("row 5 / row 6 删除的区块", () => {
    it("创作团队黑条(JIE / 桃子 / The Makers)整块不在", async () => {
      const { container } = await renderAbout("en");
      expect(screen.queryByText("JIE")).toBeNull();
      expect(screen.queryByText("桃子")).toBeNull();
      expect(screen.queryByText("The Makers")).toBeNull();
      // 结构性判断:深色色块本身也不在(不只是文字被删)
      expect(container.querySelector(".bg-ink")).toBeNull();
    });

    it("零售网络 Stockists 区块不在", async () => {
      await renderAbout("en");
      expect(screen.queryByText("Stockists")).toBeNull();
      expect(screen.queryByText(/Shanghai TX Huaihai/)).toBeNull();
      expect(screen.queryByText(/Hangzhou Intime/)).toBeNull();
    });

    it("zh 页同样不再出现这两块", async () => {
      await renderAbout("zh");
      expect(screen.queryByText("创作团队")).toBeNull();
      expect(screen.queryByText("零售网络")).toBeNull();
    });
  });

  describe("row 7 后续计划", () => {
    it("换成首页那块:NEW IPS AHEAD + comingSub + UpcomingCard 角色插画", async () => {
      const { container } = await renderAbout("en");
      expect(screen.getByRole("heading", { level: 2, name: "NEW IPS AHEAD" })).toBeInTheDocument();
      expect(screen.getByText(en.home.comingSub)).toBeInTheDocument();
      expect(screen.getAllByText("IN DEVELOPMENT")).toHaveLength(2);

      const sources = [...container.querySelectorAll("img")].map((img) => img.getAttribute("src") ?? "");
      expect(sources.some((src) => src.includes("upcoming-kitty"))).toBe(true);
      expect(sources.some((src) => src.includes("upcoming-butterfly"))).toBe(true);
    });

    it("旧的点阵占位与 COMING SOON — TBD 不再渲染", async () => {
      const { container } = await renderAbout("en");
      expect(screen.queryByText("Coming Soon — TBD")).toBeNull();
      expect(container.querySelector(".media-placeholder")).toBeNull();
    });
  });

  describe("about 字典", () => {
    it("en / zh key 集合完全一致", () => {
      expect(flatten(zh.about).sort()).toEqual(flatten(en.about).sort());
    });

    it("两版正文段数一致、都非空", () => {
      expect(en.about.storyParagraphs).toHaveLength(12);
      expect(zh.about.storyParagraphs).toHaveLength(12);
      expect([...en.about.storyParagraphs, ...zh.about.storyParagraphs].every((p) => p.trim().length > 0)).toBe(true);
    });

    it("旧版 team / retail / future / storyP* key 已清理", () => {
      const legacy = flatten(en.about).filter((key) => /^(team|retail|future|comingSoonLabel|storyP\d)/.test(key));
      expect(legacy).toEqual([]);
    });
  });
});
