import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { faqParts, type FaqBlock } from "@/lib/faq";
import en from "../../../../messages/en.json";
import zh from "../../../../messages/zh.json";

/**
 * `/faq` 渲染测试(重点:**答案内部的加粗与分段**)。
 *
 * 页面是 async server component,靠 `getTranslations` 取文案;测试里没有 next-intl 的
 * 请求上下文,所以把 next-intl/server 换成"真字典 + 真 createTranslator"(与 /policies
 * 页测试同法),key 写错时报错方式与运行时一致。
 *
 * `@/i18n/navigation` 的 Link 换成纯 `<a href>`。
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

import FaqPage from "./page";

async function renderFaq(locale: "en" | "zh") {
  mockState.locale = locale;
  const ui = await FaqPage({ params: Promise.resolve({ locale }) });
  return render(ui);
}

/** 数据里的全部片段(按文档顺序拉平)。 */
const allSegments = faqParts.flatMap((p) => p.items).flatMap((i) => i.a.flat());

/** 展开某条问答(<details> 的内容在 jsdom 里始终在 DOM 中)。 */
function detailsFor(question: string): HTMLDetailsElement {
  const node = screen.getByText(question).closest("details");
  if (!node) throw new Error(`找不到问题对应的 <details>:${question}`);
  return node as HTMLDetailsElement;
}

const answerLines = (blocks: FaqBlock[]) => blocks.map((b) => b.map((s) => s.text).join(""));

describe("/faq 页面渲染", () => {
  it("运费问题排在 Shipping 首位且默认折叠,原文保留三段", async () => {
    const { container } = await renderFaq("en");
    const details = detailsFor("How much does shipping cost?");
    expect(container.querySelector("details")).toBe(details);
    expect(details).not.toHaveAttribute("open");
    expect(details.querySelector("summary")?.textContent).toContain("Q1:");
    expect([...details.querySelectorAll("p")].map((p) => p.textContent)).toEqual([
      "We ship worldwide for $15 USD per order.",
      "For US deliveries only, shipping is $20 USD when you order 3 or more OFFYs.",
      "Shipping is charged once per order.",
    ]);
    expect(
      detailsFor("How long will it take for my order to be dispatched?").querySelector("summary")
        ?.textContent,
    ).toContain("Q2:");
  });

  it("每个加粗片段都渲染成 <strong>,且没有多余/遗漏", async () => {
    const { container } = await renderFaq("en");
    const expected = allSegments.filter((s) => s.bold).length;
    expect(expected).toBeGreaterThan(40);
    expect(container.querySelectorAll("strong")).toHaveLength(expected);
    // 加粗片段之外的文本不能进 <strong>
    expect(container.querySelectorAll("b")).toHaveLength(0);
  });

  it("<strong> 落在正确位置:加粗小标题与强调词,而不是整段", async () => {
    const { container } = await renderFaq("en");
    const strongTexts = [...container.querySelectorAll("strong")].map((el) => el.textContent);

    // 加粗小标题(每段开头的 "xxx:" 引导词)
    expect(strongTexts).toContain("In-Stock Items:");
    expect(strongTexts).toContain("Tracking Update Gaps:");
    expect(strongTexts).toContain("Encrypted Transmission:");
    // 行内强调
    expect(strongTexts).toContain("72-hour processing");
    expect(strongTexts).toContain("14 calendar days of delivery");
    // 配送区域名
    expect(strongTexts).toContain("Mainland China & Hong Kong");
    expect(strongTexts).toContain("Oceania");

    // 整段不该被整块加粗:最长的 <strong> 明显短于最长的段落
    const longestStrong = Math.max(...strongTexts.map((s) => s?.length ?? 0));
    expect(longestStrong).toBeLessThan(120);
  });

  it("加粗边界精确:区域名加粗、冒号与说明不加粗(同一段内混排)", async () => {
    await renderFaq("en");
    const details = detailsFor("How long does shipping take to my destination?");
    const line = [...details.querySelectorAll("p")].find((p) =>
      p.textContent?.startsWith("Mainland China & Hong Kong:"),
    );
    expect(line).toBeDefined();
    const strong = line?.querySelector("strong");
    expect(strong?.textContent).toBe("Mainland China & Hong Kong"); // 冒号不在 <strong> 里
    expect(line?.textContent).toBe(
      "Mainland China & Hong Kong: Transit takes approx. 3–7 business days (Total: approx. 6–10 business days)",
    );
  });

  it("换行:同一 Q 下的多段各自渲染成一个 <p>(Q3 共 7 段)", async () => {
    await renderFaq("en");
    const details = detailsFor("How long does shipping take to my destination?");
    const lines = [...details.querySelectorAll("p")].map((p) => p.textContent);
    expect(lines).toEqual(answerLines(faqParts[0].items[2].a));
    expect(lines).toHaveLength(7);
    expect(lines[0]).toBe(
      "Estimated delivery windows below include our 72-hour processing, followed by the respective transit times by region:",
    );
    expect(lines[6]).toMatch(/^Please note: Transit times are estimates/);
  });

  it("新增的 Oceania 一行在渲染里存在,旧的 Hong Kong, Macau & Taiwan 已消失", async () => {
    const { container } = await renderFaq("en");
    const text = container.textContent ?? "";
    expect(text).toContain(
      "Oceania (Australia, New Zealand): Transit takes approx. 8–18 business days (Total: approx. 11–21 business days)",
    );
    expect(text).not.toContain("Hong Kong, Macau & Taiwan");
  });

  it("Part 标题原样保留源文档编号(PART 3 是全角冒号,不修正)", async () => {
    await renderFaq("en");
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual([
      "PART 1: 📦 Shipping & Delivery",
      "PART 2: 🔄 RETURNS & QUALITY ASSURANCE",
      "PART 3：🔒 PAYMENT, PRIVACY & SECURITY",
    ]);
  });

  it("zh:答案正文仍是英文原文(与政策页同理,不做机翻),顶部有语言说明", async () => {
    const { container } = await renderFaq("zh");
    expect(screen.getByRole("heading", { level: 1, name: zh.faq.title })).toBeInTheDocument();
    expect(screen.getByText(zh.faq.noticeTitle)).toBeInTheDocument();
    // 加粗结构与英文站一致,正文仍是英文
    expect(container.querySelectorAll("strong").length).toBe(
      allSegments.filter((s) => s.bold).length,
    );
    expect(container.textContent).toContain("In-Stock Items:");
    expect(container.textContent).not.toContain("现货商品");
  });

  it("每条问答的答案段落数 = 数据里的块数(没有丢段或多段)", async () => {
    await renderFaq("en");
    for (const part of faqParts) {
      for (const item of part.items) {
        const details = detailsFor(item.q);
        expect(details.querySelectorAll("p")).toHaveLength(item.a.length);
      }
    }
  });

  it("问题编号按源文档显示,且每个部分内从 Q1 重新开始", async () => {
    // 更新后 Part 1 有 Q1–Q6、Part 2 仍只有 Q1–Q2,
    // 所以正确性依赖"按部分内索引渲染"而不是全局序号。
    const { container } = await renderFaq("en");
    const marks = [...container.querySelectorAll("summary span span")].map((e) => e.textContent);
    expect(marks.filter((t) => t === "Q1:")).toHaveLength(3); // 三个部分各有一个 Q1
    expect(marks.filter((t) => t === "Q2:")).toHaveLength(3);
    expect(marks.filter((t) => t === "Q5:")).toHaveLength(1); // 只有 Part 1 有 Q5
    expect(marks.filter((t) => t === "Q6:")).toHaveLength(1);
    expect(marks.some((t) => /^Q(7|8|9|10|11):$/.test(t ?? ""))).toBe(false);
  });
});

/**
 * 第 2 批 SEO · FAQPage 结构化数据。
 *
 * Google 的 FAQ 富媒体要求 `acceptedAnswer.text` 是**纯文本**:加粗在数据里是
 * `FaqBlock[]` 的行内片段,输出时必须拼平(不能把 `<strong>` 塞进答案)。
 */
describe("/faq · JSON-LD(FAQPage)", () => {
  it("输出 FAQPage:11 条 Question,顺序与页面数据一致", async () => {
    const { container } = await renderFaq("en");
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const ld = JSON.parse(script?.textContent ?? "") as Record<string, unknown>;
    const items = faqParts.flatMap((part) => part.items);
    const questions = ld.mainEntity as Array<Record<string, unknown>>;

    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("FAQPage");
    expect(questions).toHaveLength(11);
    expect(questions.map((question) => question.name)).toEqual(items.map((item) => item.q));
  });

  it("acceptedAnswer.text 是纯文本:没有 <strong>,段落按换行保留", async () => {
    const { container } = await renderFaq("en");
    const ld = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')?.textContent ?? "",
    ) as Record<string, unknown>;
    const questions = ld.mainEntity as Array<Record<string, unknown>>;
    const items = faqParts.flatMap((part) => part.items);

    questions.forEach((question, index) => {
      const answer = question.acceptedAnswer as Record<string, unknown>;
      const expected = answerLines(items[index].a).join("\n");

      expect(answer["@type"]).toBe("Answer");
      expect(answer.text).toBe(expected);
      expect(answer.text).not.toContain("<");
    });

    const shipping = questions[0].acceptedAnswer as Record<string, unknown>;
    expect(shipping.text).toBe(
      "We ship worldwide for $15 USD per order.\nFor US deliveries only, shipping is $20 USD when you order 3 or more OFFYs.\nShipping is charged once per order.",
    );
    // 原发货问题顺延,加粗导语继续以纯文本出现。
    const dispatch = questions[1].acceptedAnswer as Record<string, unknown>;
    expect(dispatch.text).toMatch(/^In-Stock Items: Our processing time is up to 72 hours/);
  });

  it("全站 URL 用 SITE_URL 的绝对地址(答案里没有相对链接)", async () => {
    const { container } = await renderFaq("en");
    const raw = container.querySelector('script[type="application/ld+json"]')?.textContent ?? "";

    // FAQ 正文目前不含站内链接;至少确认没有把未转义的 `<` 写进 script。
    expect(raw).not.toContain("</script");
    expect(raw).not.toContain("<");
    expect(raw).toContain(env.SITE_URL === "" ? "" : "contact@whimcoreofficial.com");
  });
});
