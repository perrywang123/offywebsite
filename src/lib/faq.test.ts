import { describe, expect, it } from "vitest";
import { faqParts, type FaqBlock } from "./faq";

/** 块数组 → 段落纯文本(片段按顺序拼接,加粗与否不影响文本)。 */
const lines = (blocks: FaqBlock[]): string[] => blocks.map((b) => b.map((s) => s.text).join(""));

/** 某条问答里所有加粗片段的文本(按文档顺序)。 */
const boldTexts = (block: FaqBlock): string[] =>
  block.filter((s) => s.bold).map((s) => s.text.trim());

describe("FAQ 内容(来自 独立站Q&A_审核修订稿——final(2).docx)", () => {
  it("三个部分、共 10 条问答", () => {
    expect(faqParts).toHaveLength(3);
    expect(faqParts.reduce((n, p) => n + p.items.length, 0)).toBe(10);
    expect(faqParts.map((p) => p.items.length)).toEqual([5, 2, 3]);
  });

  it("部分标题按源文档原样带编号(PART 3 是全角冒号,不要顺手修正)", () => {
    expect(faqParts.map((p) => p.title)).toEqual([
      "Part 1: 📦 Shipping & Delivery",
      "PART 2: 🔄 RETURNS & QUALITY ASSURANCE",
      "PART 3：🔒 PAYMENT, PRIVACY & SECURITY",
    ]);
  });

  it("每条都有非空的问题与答案,答案按源文档分段", () => {
    for (const part of faqParts) {
      expect(part.title.trim()).not.toBe("");
      for (const item of part.items) {
        expect(item.q.trim().length).toBeGreaterThan(8);
        expect(item.a.length).toBeGreaterThan(0);
        for (const block of item.a) {
          expect(block.length).toBeGreaterThan(0);
          expect(
            block
              .map((s) => s.text)
              .join("")
              .trim().length,
          ).toBeGreaterThan(0);
        }
        expect(lines(item.a).join(" ").trim().length).toBeGreaterThan(40);
      }
    }
  });

  it("片段已规范化:加粗片段不含分隔空格,段落行尾多余空格已 trim", () => {
    for (const part of faqParts) {
      for (const item of part.items) {
        for (const block of item.a) {
          for (const seg of block) {
            expect(seg.text.trim()).not.toBe("");
            // 段内不出现连续空格 / 制表符(源文档行尾的 2–3 个空格已折叠成 1 个或删掉)
            expect(seg.text).not.toMatch(/ {2}|\t/);
            // 片段边界的分隔空格只落在**非加粗**一侧:`<strong>` 里不带首尾空格
            if (seg.bold) expect(seg.text).toBe(seg.text.trim());
          }
          // 段落首尾不留多余空格(源文档行尾空格)
          expect(block[0].text).toBe(block[0].text.trimStart());
          expect(block[block.length - 1].text).toBe(block[block.length - 1].text.trimEnd());
        }
      }
    }
  });

  it("配送区域:Mainland China & Hong Kong + 新增 Oceania,旧的 Hong Kong, Macau & Taiwan 已删", () => {
    const shipping = lines(faqParts[0].items[1].a);
    expect(shipping).toEqual([
      "Estimated delivery windows below include our 72-hour processing, followed by the respective transit times by region:",
      "Mainland China & Hong Kong: Transit takes approx. 3–7 business days (Total: approx. 6–10 business days)",
      "Southeast Asia (Singapore, Malaysia, Thailand and etc.): Transit takes approx. 5–10 business days (Total: approx. 8–13 business days)",
      "Europe(UK): Transit takes approx. 7–14 business days (Total: approx. 10–17 business days)",
      "North America (United States, Canada): Transit takes approx. 8–18 business days (Total: approx. 11–21 business days)",
      "Oceania (Australia, New Zealand): Transit takes approx. 8–18 business days (Total: approx. 11–21 business days)",
      "Please note: Transit times are estimates provided in good faith and are not guaranteed. Delivery to remote or outlying areas, or during peak shopping seasons (such as Black Friday and Christmas), may require additional time.",
    ]);
    expect(lines(faqParts[0].items[1].a).join("\n")).not.toContain("Hong Kong, Macau & Taiwan");
  });

  it("加粗落在源文档加粗的地方:每段的小标题 + 行内强调词", () => {
    // 每条问答的加粗片段(文档顺序),与 docx runs 的 bold 一一对应
    const perItem = faqParts.flatMap((p) => p.items).map((item) => item.a.flatMap(boldTexts));
    expect(perItem).toEqual([
      ["In-Stock Items:", "72 hours", "Pre-Order Items:"],
      [
        "72-hour processing",
        "Mainland China & Hong Kong",
        "Southeast Asia",
        "Europe",
        "North America",
        "Oceania",
      ],
      [
        "24 hours after your order completes processing",
        "Tracking Update Gaps:",
        "no updates for more than 7 business days (or 10 calendar days)",
        "contact@whimcoreofficial.com",
      ],
      [
        "In-Stock Orders:",
        "within 24 hours of placing your order",
        "strictly before the order enters the processing phase",
        "contact@whimcoreofficial.com",
        "Pre-Orders:",
        "prior to the stock arriving and the order entering the fulfillment processing stage",
        "Post-Dispatch:",
      ],
      [
        "Customer Responsibility After Dispatch (Non-Refundable)",
        "the customer assumes full responsibility, and the order is non-refundable and ineligible for return",
        "Address Verification (7-Day Email Response Window)",
        "primarily via official email",
        "Please reply with your complete address within 7 days.",
        "will be automatically cancelled and refunded.",
      ],
      [
        "Minor Loose Threads:",
        "Subtle Asymmetry:",
        "Transit Flattening / Pile Impression:",
        "Measurement Tolerances:",
      ],
      [
        "Claim Window:",
        "14 calendar days of delivery",
        "Required Proof:",
        "contact@whimcoreofficial.com",
        "Order ID",
        "clear defect photos",
        "continuous, unedited one-take unboxing video",
        "Processing:",
        "5 business days",
      ],
      [
        "Encrypted Transmission:",
        "TLS/SSL encryption protocols",
        "No Card Data Stored:",
        "PCI-DSS Level 1 certified payment gateways",
      ],
      [],
      ["Order Fulfilment Only:", "We Do Not Sell Your Data"],
    ]);
  });

  it("加粗与正文同段混排(小标题加粗、冒号后的正文不加粗)", () => {
    expect(faqParts[0].items[0].a[1]).toEqual([
      { text: "Pre-Order Items:", bold: true },
      {
        text: " Pre-orders will be dispatched according to the estimated release date stated on the product page.",
      },
    ]);
    // 区域行:只有区域名加粗
    expect(faqParts[0].items[1].a[1]).toEqual([
      { text: "Mainland China & Hong Kong", bold: true },
      {
        text: ": Transit takes approx. 3–7 business days (Total: approx. 6–10 business days)",
      },
    ]);
  });

  it("批注锚点残留的空括号已清掉(提取稿的已知污染)", () => {
    const all = JSON.stringify(faqParts);
    for (const bad of ["locked()", "distortion()", "fullness()", "cm()"]) {
      expect(all).not.toContain(bad);
    }
    // 清洗只删括号,正文还在
    expect(all).toContain("address updates will be locked.");
    expect(all).toContain("±1–2 cm.");
  });

  it("不含审核意见(那是批注,不是给顾客看的内容)", () => {
    const all = JSON.stringify(faqParts);
    expect(all).not.toContain("审核意见");
    expect(all).not.toContain("建议保留此修订");
    expect(all).not.toContain("基于贵司");
  });

  it("客服邮箱与政策页保持一致", () => {
    expect(JSON.stringify(faqParts)).toContain("contact@whimcoreofficial.com");
  });
});
