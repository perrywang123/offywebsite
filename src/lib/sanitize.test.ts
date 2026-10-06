import { describe, expect, it } from "vitest";
import { sanitizePolicyHtml } from "./sanitize";

describe("sanitizePolicyHtml (政策正文白名单消毒)", () => {
  it("保留白名单标签与文字", () => {
    const out = sanitizePolicyHtml("<p>Hello <b>world</b></p>");
    expect(out).toBe("<p>Hello <b>world</b></p>");
  });

  it("剥掉全部属性(Shopify 政策正文的 class=\"p1\" 来自 PDF 导出,对本站无意义)", () => {
    expect(sanitizePolicyHtml('<p class="p1" style="color:red">x</p>')).toBe("<p>x</p>");
    expect(sanitizePolicyHtml('<span class="s1">y</span>')).toBe("<span>y</span>");
  });

  it("丢弃 script/style 标签及其内容", () => {
    expect(sanitizePolicyHtml('<p>a</p><script>alert(1)</script><p>b</p>')).toBe("<p>a</p><p>b</p>");
    expect(sanitizePolicyHtml("<style>p{color:red}</style><p>a</p>")).toBe("<p>a</p>");
  });

  it("丢弃事件处理器属性", () => {
    // 标签本身不在白名单 → 整段丢弃
    expect(sanitizePolicyHtml('<img src=x onerror="alert(1)">')).toBe("");
    // a 在白名单,但 on* 不是允许属性 → 只保留 href
    expect(sanitizePolicyHtml('<a href="https://a.com" onclick="evil()">x</a>')).toBe(
      '<a href="https://a.com" rel="noopener noreferrer" target="_blank">x</a>',
    );
  });

  it("拦截 javascript: 等危险 href", () => {
    expect(sanitizePolicyHtml('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
    expect(sanitizePolicyHtml('<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>')).toBe("<a>x</a>");
    expect(sanitizePolicyHtml('<a href="mailto:a@b.com">x</a>')).toBe(
      '<a href="mailto:a@b.com" rel="noopener noreferrer" target="_blank">x</a>',
    );
  });

  it("保留表格(shipping policy 用了 table)", () => {
    const html = "<table><tbody><tr><td>a</td><td>b</td></tr></tbody></table>";
    expect(sanitizePolicyHtml(html)).toBe(html);
  });

  it("原样保留 HTML 实体(不解码也不二次转义)", () => {
    expect(sanitizePolicyHtml("<p>a &ndash; b &amp; c</p>")).toBe("<p>a &ndash; b &amp; c</p>");
  });

  it("丢弃未闭合的尖括号与伪装标签,不吞掉后面正文", () => {
    expect(sanitizePolicyHtml("<p>a < b</p>")).toBe("<p>a  b</p>");
    expect(sanitizePolicyHtml('<p>safe</p><img src=x><p>after</p>')).toBe("<p>safe</p><p>after</p>");
  });

  it("空输入返回空串", () => {
    expect(sanitizePolicyHtml("")).toBe("");
  });

  it("自闭合与空元素标签规范化", () => {
    expect(sanitizePolicyHtml("<p>a<br/>b</p>")).toBe("<p>a<br>b</p>");
  });
});
