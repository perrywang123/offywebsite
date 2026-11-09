import { describe, expect, it } from "vitest";
import {
  countryFromLanguage,
  countryFromTimeZone,
  normalizeMarketCountry,
  parseMarketCookie,
  serializeMarketCookie,
  MARKET_COOKIE,
} from "./market";

describe("destination signals", () => {
  it("accepts geographical zones and legacy browser aliases, never generic offsets", () => {
    expect(countryFromTimeZone("Europe/London")).toBe("GB");
    expect(countryFromTimeZone("Asia/Singapore")).toBe("SG");
    expect(countryFromTimeZone("Asia/Hong_Kong")).toBe("HK");
    expect(countryFromTimeZone("US/Eastern")).toBe("US");
    for (const zone of ["UTC", "Etc/GMT-8", "+08:00", "America/Unknown", "", "UTC<script>"])
      expect(countryFromTimeZone(zone)).toBeUndefined();
  });
  it("only regional languages can imply a country and q=0 is excluded", () => {
    expect(countryFromLanguage(["en", "en-GB"])).toBe("GB");
    expect(countryFromLanguage("en-US;q=0,en-GB;q=0.8,zh;q=0.9")).toBe("GB");
    expect(countryFromLanguage(["zh-Hant-HK"])).toBe("HK");
    for (const language of ["en", "zh", "es-419", "en-QQ", "en-US;q=0"])
      expect(countryFromLanguage(language)).toBeUndefined();
  });
  it("normalizes UK and rejects arbitrary two-letter strings", () => {
    expect(normalizeMarketCountry(" uk ")).toBe("GB");
    expect(normalizeMarketCountry("hk")).toBe("HK");
    for (const country of ["XX", "EU", "QQ", "AA", "T1", "USA"])
      expect(normalizeMarketCountry(country)).toBeUndefined();
  });
  it("round-trips bounded destination preferences and ignores invalid cookie payloads", () => {
    const cookie = serializeMarketCookie({
      country: "GB",
      source: "timezone",
      timeZone: "Europe/London",
    });
    expect(parseMarketCookie(`other=value; ${MARKET_COOKIE}=${cookie}`)).toEqual({
      country: "GB",
      source: "timezone",
      timeZone: "Europe/London",
    });
    for (const value of [
      "%",
      "null",
      "[]",
      encodeURIComponent(JSON.stringify({ country: "QQ", source: "manual" })),
      "x".repeat(3000),
    ])
      expect(parseMarketCookie(`${MARKET_COOKIE}=${value}`)).toBeUndefined();
  });
});
