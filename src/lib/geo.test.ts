import { describe, expect, it, vi } from "vitest";
import {
  flagEmoji,
  normalizeCountryCode,
  parseRegionList,
  pickCountry,
  regionBadgeLabel,
  regionBadgeShortLabel,
} from "./geo";
vi.mock("geoip-lite", () => ({ default: { lookup: () => null } }));
vi.mock("@/lib/env", () => ({ env: { GEO_TRUSTED_COUNTRY_HEADER: "cf-ipcountry" } }));

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

  it("窄屏短徽章用 ISO 缩写,并把 GB 归一成 UK(与完整句措辞一致)", () => {
    expect(regionBadgeShortLabel("US")).toBe("US ONLY");
    expect(regionBadgeShortLabel("UK")).toBe("UK ONLY");
    expect(regionBadgeShortLabel("GB")).toBe("UK ONLY");
    expect(regionBadgeShortLabel("HK")).toBe("HK ONLY");
    // 短文案必须真的比完整句短,否则换了个寂寞
    expect(regionBadgeShortLabel("US").length).toBeLessThan(regionBadgeLabel("US").length);
  });

  it("pickCountry 也会把 UK 归一成 GB(两个出口都要)", () => {
    // 光有 normalizeCountryCode 不够 —— 它得真的接在 pickCountry 的返回路径上。
    // 之前没接,实测 `cf-ipcountry: UK` 会原样透传给 Shopify,而 Shopify Markets
    // 不认 "UK",于是落回默认市场:币种变成美元,区域限定区块整个消失。
    expect(pickCountry(new Headers({ "cf-ipcountry": "UK" }))).toBe("GB");
    expect(pickCountry(new Headers({ "cf-ipcountry": "GB" }))).toBe("GB");
    expect(pickCountry(new Headers())).toBe("US");
  });
});
