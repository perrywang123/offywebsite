import { describe, expect, it } from "vitest";
import { faqParts } from "./faq";

describe("FAQ 内容(来自 独立站Q&A_审核修订稿(1).pages)", () => {
  it("三个部分、共 10 条问答", () => {
    expect(faqParts).toHaveLength(3);
    expect(faqParts.reduce((n, p) => n + p.items.length, 0)).toBe(10);
    expect(faqParts.map((p) => p.items.length)).toEqual([5, 2, 3]);
  });

  it("每条都有非空的问题与答案", () => {
    for (const part of faqParts) {
      expect(part.title.trim()).not.toBe("");
      for (const item of part.items) {
        expect(item.q.trim().length).toBeGreaterThan(8);
        expect(item.a.trim().length).toBeGreaterThan(40);
      }
    }
  });

  it("批注锚点残留的空括号已清掉(提取稿的已知污染)", () => {
    const all = JSON.stringify(faqParts);
    for (const bad of ["locked()", "distortion()", "fullness()", "cm()"]) {
      expect(all).not.toContain(bad);
    }
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
