import { describe, expect, it } from "vitest";
import { parseDescriptionHtml } from "./description-html";

describe("parseDescriptionHtml", () => {
  it("parses a bold lead paragraph followed by a normal paragraph", () => {
    const html =
      "<p><b>A sweet sunny day in a blooming garden.</b></p>\n" +
      "<p><span>Dressed in a pastel floral sundress with a lace headband. Sweet and refreshing.</span></p>";
    expect(parseDescriptionHtml(html)).toEqual([
      { text: "A sweet sunny day in a blooming garden.", bold: true },
      {
        text: "Dressed in a pastel floral sundress with a lace headband. Sweet and refreshing.",
        bold: false,
      },
    ]);
  });

  it("strips Shopify editor artefacts (comments, spans, sup, ids) from the real payload", () => {
    // 真实 Shopify descriptionHtml 样本(afternoon-muse),含大量 <!----> 与嵌套 span
    const html =
      '<p><b>A sweet sunny day in a blooming garden.</b></p>\n' +
      '<p id="p-rc_0ce6faebda64517e-225"><span>Dressed in a pastel floral sundress with a delicate lace headband and a micro faux-pearl crossbody pouch</span>' +
      "<span><!----><!----></span>" +
      '<sup class="superscript"><!----></sup>' +
      "<span>. Sweet and refreshing, she brings the relaxed luxury of a sun-drenched garden tea right into your day</span>" +
      "<span><!----></span><span></span></p>";
    expect(parseDescriptionHtml(html)).toEqual([
      { text: "A sweet sunny day in a blooming garden.", bold: true },
      {
        text: "Dressed in a pastel floral sundress with a delicate lace headband and a micro faux-pearl crossbody pouch. Sweet and refreshing, she brings the relaxed luxury of a sun-drenched garden tea right into your day",
        bold: false,
      },
    ]);
  });

  it("treats <strong> as bold too", () => {
    const html = "<p><strong>Lead.</strong></p><p>Body.</p>";
    expect(parseDescriptionHtml(html)).toEqual([
      { text: "Lead.", bold: true },
      { text: "Body.", bold: false },
    ]);
  });

  it("decodes common HTML entities", () => {
    const html = "<p><b>Tom &amp; Jerry&#39;s &quot;garden&quot;</b></p>";
    expect(parseDescriptionHtml(html)).toEqual([
      { text: "Tom & Jerry's \"garden\"", bold: true },
    ]);
  });

  it("collapses whitespace and skips empty paragraphs", () => {
    const html = "<p>  </p><p><b>  Spaced   out   lead  </b></p><p><br></p>";
    expect(parseDescriptionHtml(html)).toEqual([
      { text: "Spaced out lead", bold: true },
    ]);
  });

  it("falls back to a single plain block for text without <p> tags", () => {
    expect(parseDescriptionHtml("Just a plain sentence.")).toEqual([
      { text: "Just a plain sentence.", bold: false },
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseDescriptionHtml("")).toEqual([]);
    expect(parseDescriptionHtml("   ")).toEqual([]);
  });
});
