import { describe, expect, it } from "vitest";
import { flagEmoji, normalizeCountryCode, parseRegionList, pickCountry, regionBadgeLabel } from "./geo";

describe("pickCountry (访客国家判定)", () => {
  it("优先用 Cloudflare 的 cf-ipcountry", () => {
    expect(pickCountry({ "cf-ipcountry": "GB", "x-country-code": "DE" })).toBe("GB");
  });

  it("按优先级依次回退到 nginx GeoIP2 等头", () => {
    expect(pickCountry({ "x-country-code": "hk" })).toBe("HK");
    expect(pickCountry({ "x-geo-country": "jp" })).toBe("JP");
    expect(pickCountry({ "x-forwarded-country": "ca" })).toBe("CA");
  });

  it("大小写与空白归一", () => {
    expect(pickCountry({ "cf-ipcountry": "  sg " })).toBe("SG");
  });

  it("排除 Cloudflare/Vercel 的非国家占位值", () => {
    // XX=未知, T1=Tor:都不能当国家用,应继续往后找
    expect(pickCountry({ "cf-ipcountry": "XX", "x-country-code": "MY" })).toBe("MY");
    expect(pickCountry({ "cf-ipcountry": "T1", "x-country-code": "AU" })).toBe("AU");
    // 全被排除 → 回落
    expect(pickCountry({ "cf-ipcountry": "XX" }, "GB")).toBe("GB");
  });

  it("非法值(非两位字母 / 洲际码)被忽略", () => {
    expect(pickCountry({ "cf-ipcountry": "USA", "x-country-code": "EU" }, "DE")).toBe("DE");
    expect(pickCountry({}, "fr")).toBe("FR");
  });

  it("什么都没有时回落到默认(与改造前行为一致 = US)", () => {
    expect(pickCountry({})).toBe("US");
    expect(pickCountry({ "cf-ipcountry": "" })).toBe("US");
  });

  it("支持 Headers 实例", () => {
    const h = new Headers({ "x-country-code": "nz" });
    expect(pickCountry(h)).toBe("NZ");
  });
});

describe("parseRegionList (探测国家列表)", () => {
  it("解析逗号分隔并去重、转大写", () => {
    expect(parseRegionList("us, gb ,US,de", ["XX"])).toEqual(["US", "GB", "DE"]);
  });

  it("过滤非法项,全非法时用默认", () => {
    expect(parseRegionList("usa,,EU,1A", ["US", "GB"])).toEqual(["US", "GB"]);
    expect(parseRegionList("", ["US", "GB"])).toEqual(["US", "GB"]);
    expect(parseRegionList(undefined, ["US"])).toEqual(["US"]);
  });
});

describe("区域限定徽章", () => {
  it("国旗按字母推导", () => {
    expect(flagEmoji("US")).toBe("🇺🇸");
    expect(flagEmoji("gb")).toBe("🇬🇧");
    expect(flagEmoji("HK")).toBe("🇭🇰");
    expect(flagEmoji("USA")).toBe("");
  });

  it("把非 ISO 的 UK 归一到 GB(设计稿/人工标注习惯写 UK)", () => {
    expect(flagEmoji("UK")).toBe("🇬🇧");
    expect(regionBadgeLabel("UK")).toBe("AVAILABLE IN THE UK ONLY");
    expect(normalizeCountryCode("uk")).toBe("GB");
    expect(normalizeCountryCode("us")).toBe("US");
  });

  it("美国/英国保留 PSD 里的措辞", () => {
    expect(regionBadgeLabel("US")).toBe("AVAILABLE IN THE U.S. ONLY");
    expect(regionBadgeLabel("GB")).toBe("AVAILABLE IN THE UK ONLY");
  });

  it("其它国家用 Intl.DisplayNames 取国名,新增区域无需改代码", () => {
    expect(regionBadgeLabel("DE")).toBe("AVAILABLE IN GERMANY ONLY");
    expect(regionBadgeLabel("HK")).toBe("AVAILABLE IN HONG KONG ONLY");
  });
});
