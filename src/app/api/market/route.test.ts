// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const dependencies = vi.hoisted(() => ({ countries: vi.fn(), lookup: vi.fn() }));
vi.mock("@/server/shopify/localization", () => ({ getMarketCountries: dependencies.countries }));
vi.mock("geoip-lite", () => ({ default: { lookup: dependencies.lookup } }));
vi.mock("@/lib/env", () => ({
  env: { SITE_URL: "https://isoffy.com", GEO_TRUSTED_COUNTRY_HEADER: "" },
}));
import { GET, POST } from "./route";
import { MARKET_COOKIE, serializeMarketCookie } from "@/lib/market";
const countries = [
  { code: "US", name: "United States", currency: "USD" },
  { code: "GB", name: "United Kingdom", currency: "GBP" },
];
const request = (
  body: unknown,
  origin = "https://isoffy.com",
  headers: Record<string, string> = {},
) =>
  new Request("https://isoffy.com/api/market", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  dependencies.countries.mockReset().mockResolvedValue(countries);
  dependencies.lookup.mockReset().mockReturnValue(null);
});
describe("market preference endpoint", () => {
  it("uses browser fallback and writes a private automatic cookie valid for 30 minutes", async () => {
    const response = await POST(
      request({ mode: "resolve", timeZone: "Europe/London", languages: ["en-US"] }),
    );
    expect(await response.json()).toMatchObject({
      country: "GB",
      source: "timezone",
      resolvedAt: expect.any(Number),
    });
    expect(response.headers.get("set-cookie")).toContain(MARKET_COOKIE);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=1800");
    expect(dependencies.countries).not.toHaveBeenCalled();
  });
  it("does not renew an unexpired automatic cookie on repeated resolution", async () => {
    const resolvedAt = Date.now() - 600_000;
    const cookie = `${MARKET_COOKIE}=${encodeURIComponent(JSON.stringify({ country: "GB", source: "ip", resolvedAt }))}`;
    const response = await POST(
      request({ mode: "resolve", timeZone: "Asia/Singapore" }, undefined, { cookie }),
    );
    expect(await response.json()).toMatchObject({
      country: "GB",
      source: "ip",
      persisted: true,
      resolvedAt,
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });
  it("ignores expired automatic cookies, resolves current IP, and persists the actual wire value", async () => {
    dependencies.lookup.mockReturnValue({ country: "SG" });
    const old = `${MARKET_COOKIE}=${encodeURIComponent(JSON.stringify({ country: "GB", source: "ip", resolvedAt: Date.now() - 1_800_000 }))}`;
    const context = await GET(
      new Request("https://isoffy.com/api/market?context=1", {
        headers: { cookie: old, "x-real-ip": "8.8.8.8" },
      }),
    );
    expect(await context.json()).toMatchObject({ country: "SG", source: "ip", persisted: false });
    expect(context.headers.get("set-cookie")).toBeNull();
    const response = await POST(
      request({ mode: "resolve" }, undefined, { cookie: old, "x-real-ip": "8.8.8.8" }),
    );
    const cookie = response.headers.get("set-cookie")!.split(";", 1)[0];
    const next = await GET(
      new Request("https://isoffy.com/api/market?context=1", { headers: { cookie } }),
    );
    expect(await next.json()).toMatchObject({
      country: "SG",
      source: "ip",
      persisted: true,
      resolvedAt: expect.any(Number),
    });
  });
  it("only accepts manual destinations enabled in Shopify, with an explicit saved preference", async () => {
    const ok = await POST(request({ mode: "select", country: "gb" }));
    expect(await ok.json()).toMatchObject({ country: "GB", source: "manual" });
    expect(ok.headers.get("set-cookie")).toContain("Max-Age=7776000");
    const rejected = await POST(request({ mode: "select", country: "HK" }));
    expect(rejected.status).toBe(400);
    expect(rejected.headers.get("set-cookie")).toBeNull();
  });
  it("preserves manual decisions, defaults to US and rejects cross-origin or malformed changes", async () => {
    const cookie = `${MARKET_COOKIE}=${serializeMarketCookie({ country: "US", source: "manual" })}`;
    expect(
      await (
        await POST(request({ mode: "resolve", timeZone: "Europe/London" }, undefined, { cookie }))
      ).json(),
    ).toMatchObject({ country: "US", source: "manual", persisted: true });
    expect(
      await (await POST(request({ mode: "resolve", timeZone: "UTC", languages: ["en"] }))).json(),
    ).toMatchObject({ country: "US", source: "default" });
    expect(
      (await POST(request({ mode: "select", country: "US" }, "https://other.example"))).status,
    ).toBe(403);
    expect((await POST(request({ mode: "select", country: "QQ" }))).status).toBe(400);
  });
  it("does not change cookies when Shopify market validation fails; context read avoids Shopify", async () => {
    dependencies.countries.mockRejectedValue(new Error("unavailable"));
    const response = await POST(request({ mode: "select", country: "GB" }));
    expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).toBeNull();
    dependencies.countries.mockClear();
    const context = await GET(new Request("https://isoffy.com/api/market?context=1"));
    expect(await context.json()).toMatchObject({ country: "US", persisted: false });
    expect(dependencies.countries).not.toHaveBeenCalled();
    expect(context.headers.get("cache-control")).toContain("no-store");
  });
});

it("reads the actual Set-Cookie wire value on the next request", async () => {
  const response = await POST(
    new Request("http://localhost:3000/api/market", {
      method: "POST",
      headers: { Origin: "https://isoffy.com", "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "resolve", timeZone: "Europe/London", languages: ["en-US"] }),
    }),
  );
  const cookie = response.headers.get("set-cookie")!.split(";", 1)[0];
  const next = await GET(
    new Request("http://localhost:3000/api/market?context=1", { headers: { cookie } }),
  );
  expect(await next.json()).toMatchObject({ country: "GB", source: "timezone", persisted: true });
});
