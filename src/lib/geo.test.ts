import { beforeEach, describe, expect, it, vi } from "vitest";
import { flagEmoji, normalizeCountryCode, parseRegionList, pickCountry, regionBadgeLabel } from "./geo";

// geoip-lite 在 import 时就会同步把 ~115MB 的数据库读进内存,而单测既不该付这个
// 代价,也不该依赖真实库的数据(库随 MaxMind 更新,今天的公网 IP 明天可能换国家)。
// 所以整个文件把 lookup mock 掉,只验证**我们自己那一层**:取哪个 IP、怎么归一化、
// 拿不到国家时怎么回落。真实数据文件的端到端可用性由容器实测覆盖
// (见 docs/deployment.md「区域限定与币种」)。
const { lookupMock } = vi.hoisted(() => ({ lookupMock: vi.fn() }));

vi.mock("geoip-lite", () => ({
  default: { lookup: lookupMock },
  lookup: lookupMock,
}));

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

describe("pickCountry — 国家头全缺失时按客户端 IP 解析(不需 nginx GeoIP2 / Cloudflare)", () => {
  beforeEach(() => {
    lookupMock.mockReset();
    lookupMock.mockReturnValue(null);
  });

  it("有国家头时**优先用头**,根本不查 IP", () => {
    lookupMock.mockReturnValue({ country: "DE" });
    expect(pickCountry({ "cf-ipcountry": "GB", "x-forwarded-for": "8.8.8.8" }, "US")).toBe("GB");
    expect(pickCountry({ "x-country-code": "hk", "x-forwarded-for": "8.8.8.8" }, "US")).toBe("HK");
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it("没有国家头、x-forwarded-for 是公网 IP 时解析出国家", () => {
    lookupMock.mockReturnValue({ country: "DE" });
    expect(pickCountry({ "x-forwarded-for": "8.8.8.8" }, "US")).toBe("DE");
    expect(lookupMock).toHaveBeenCalledWith("8.8.8.8");
  });

  it("x-forwarded-for 是代理链时取第一个地址", () => {
    // nginx 用 $proxy_add_x_forwarded_for,格式是 "客户端, 中间代理, ...",
    // 只有第一个才是访客。整串丢给 lookup 会解析失败 → 全部回落默认市场。
    lookupMock.mockReturnValue({ country: "JP" });
    expect(pickCountry({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }, "US")).toBe("JP");
    expect(lookupMock).toHaveBeenCalledWith("1.2.3.4");
    expect(pickCountry({ "x-forwarded-for": "  203.0.113.9 ,10.0.0.1" }, "US")).toBe("JP");
    expect(lookupMock).toHaveBeenLastCalledWith("203.0.113.9");
  });

  it("没有 x-forwarded-for 时退到 x-real-ip", () => {
    lookupMock.mockReturnValue({ country: "FR" });
    expect(pickCountry({ "x-real-ip": "8.8.4.4" }, "US")).toBe("FR");
    expect(lookupMock).toHaveBeenCalledWith("8.8.4.4");
  });

  it("IP 途径也走同一套归一化:UK → GB、哨兵值被过滤", () => {
    lookupMock.mockReturnValue({ country: "UK" });
    expect(pickCountry({ "x-forwarded-for": "8.8.8.8" }, "US")).toBe("GB");

    lookupMock.mockReturnValue({ country: "XX" });
    expect(pickCountry({ "x-forwarded-for": "8.8.8.8" }, "CA")).toBe("CA");

    lookupMock.mockReturnValue({ country: "" });
    expect(pickCountry({ "x-forwarded-for": "8.8.8.8" }, "CA")).toBe("CA");

    lookupMock.mockReturnValue({ country: "usa" });
    expect(pickCountry({ "x-forwarded-for": "8.8.8.8" }, "CA")).toBe("CA");
  });

  it("私有/回环/畸形 IP 解析不出国家 → 静默回落 fallback,不抛错", () => {
    lookupMock.mockReturnValue(null); // geoip-lite 对私有段就是返回 null
    for (const ip of [
      "127.0.0.1",
      "10.1.2.3",
      "192.168.1.7",
      "172.16.0.9",
      "::1",
      "unknown",
      "not-an-ip",
      "",
    ]) {
      expect(pickCountry({ "x-forwarded-for": ip }, "SG")).toBe("SG");
    }
  });

  it("连 IP 都没有时压根不查库", () => {
    expect(pickCountry({}, "US")).toBe("US");
    expect(pickCountry({ "cf-ipcountry": "XX" }, "US")).toBe("US");
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it("库抛错(例如数据文件没打进镜像)只是回落,不会把请求打成 500", () => {
    lookupMock.mockImplementation(() => {
      throw new Error("ENOENT: no such file or directory, open '.../geoip-country.dat'");
    });
    expect(pickCountry({ "x-forwarded-for": "8.8.8.8" }, "US")).toBe("US");
  });

  it("支持 Headers 实例(Next 的 headers() / Request.headers)", () => {
    lookupMock.mockReturnValue({ country: "FR" });
    expect(pickCountry(new Headers({ "x-forwarded-for": "8.8.8.8" }), "US")).toBe("FR");
    expect(pickCountry(new Headers(), "US")).toBe("US");
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

  it("pickCountry 也会把 UK 归一成 GB(两个出口都要)", () => {
    // 光有 normalizeCountryCode 不够 —— 它得真的接在 pickCountry 的返回路径上。
    // 之前没接,实测 `cf-ipcountry: UK` 会原样透传给 Shopify,而 Shopify Markets
    // 不认 "UK",于是落回默认市场:币种变成美元,区域限定区块整个消失。
    expect(pickCountry(new Headers({ "cf-ipcountry": "UK" }), "US")).toBe("GB");
    expect(pickCountry(new Headers({ "cf-ipcountry": "GB" }), "US")).toBe("GB");
    expect(pickCountry(new Headers(), "UK")).toBe("GB");
    expect(pickCountry(new Headers(), "US")).toBe("US");
  });
});
