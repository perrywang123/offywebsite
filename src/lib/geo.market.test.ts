// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MARKET_COOKIE, serializeMarketCookie } from "./market";
const deps = vi.hoisted(() => ({ lookup: vi.fn(), config: { GEO_TRUSTED_COUNTRY_HEADER: "" } }));
vi.mock("geoip-lite", () => ({ default: { lookup: deps.lookup } }));
vi.mock("@/lib/env", () => ({ env: deps.config }));
import { countryDecision } from "./geo";

beforeEach(() => {
  deps.lookup.mockReset().mockReturnValue(null);
  deps.config.GEO_TRUSTED_COUNTRY_HEADER = "";
});
describe("approved market precedence", () => {
  it("manual preference and an established automatic session survive IP changes", () => {
    deps.lookup.mockReturnValue({ country: "HK" });
    for (const source of ["manual", "timezone"] as const) {
      const cookie = serializeMarketCookie({ country: "US", source, resolvedAt: Date.now() });
      expect(
        countryDecision(
          new Headers({ cookie: `${MARKET_COOKIE}=${cookie}`, "x-real-ip": "8.8.8.8" }),
          { timeZone: "Europe/London" },
        ),
      ).toMatchObject({ country: "US", source, persisted: true });
    }
    expect(deps.lookup).not.toHaveBeenCalled();
  });
  it("recomputes expired and timestamp-free automatic recommendations from current IP", () => {
    deps.lookup.mockReturnValue({ country: "SG" });
    const now = Date.now();
    for (const resolvedAt of [undefined, now - 1_800_000]) {
      const cookie = encodeURIComponent(
        JSON.stringify({ country: "GB", source: "ip", resolvedAt }),
      );
      expect(
        countryDecision(
          new Headers({ cookie: `${MARKET_COOKIE}=${cookie}`, "x-real-ip": "8.8.8.8" }),
        ),
      ).toMatchObject({
        country: "SG",
        source: "ip",
        persisted: false,
        resolvedAt: expect.any(Number),
      });
    }
  });
  it("only the explicitly trusted country header can override real-client IP", () => {
    deps.lookup.mockReturnValue({ country: "SG" });
    const h = new Headers({ "cf-ipcountry": "US", "x-country-code": "HK", "x-real-ip": "8.8.8.8" });
    expect(countryDecision(h).country).toBe("SG");
    deps.config.GEO_TRUSTED_COUNTRY_HEADER = "cf-ipcountry";
    expect(countryDecision(h)).toMatchObject({ country: "US", source: "header" });
  });
  it("IP beats timezone, timezone beats browser language, and unknown signals use US", () => {
    const h = new Headers({ "x-real-ip": "8.8.8.8", "accept-language": "en-US" });
    const hints = { timeZone: "Europe/London", languages: ["en-US"] };
    deps.lookup.mockReturnValue({ country: "SG" });
    expect(countryDecision(h, hints)).toMatchObject({ country: "SG", source: "ip" });
    deps.lookup.mockReturnValue(null);
    expect(countryDecision(h, hints)).toMatchObject({ country: "GB", source: "timezone" });
    expect(countryDecision(new Headers(), { timeZone: "UTC", languages: ["en-GB"] })).toMatchObject(
      { country: "GB", source: "language" },
    );
    expect(countryDecision(new Headers(), { timeZone: "UTC", languages: ["en"] })).toMatchObject({
      country: "US",
      source: "default",
    });
  });
  it("prefers Nginx real IP, accepts IPv6, and retains no raw IP", () => {
    deps.lookup.mockReturnValue({ country: "GB" });
    const result = countryDecision(
      new Headers({ "x-real-ip": "2001:4860:4860::8888", "x-forwarded-for": "1.2.3.4, 8.8.8.8" }),
    );
    expect(deps.lookup).toHaveBeenCalledWith("2001:4860:4860::8888");
    expect(result.ipSource).toBe("x-real-ip");
    expect(JSON.stringify(result)).not.toContain("2001:4860");
  });
});
