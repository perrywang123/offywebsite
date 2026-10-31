// @vitest-environment node
import { expect, it, vi } from "vitest";
vi.mock("@/server/catalog/sitemap", () => ({ sitemapEntries: vi.fn() }));
import { sitemapEntries } from "@/server/catalog/sitemap";
import { GET } from "./route";
it("returns 503 without a partial XML document on upstream failure", async () => {
  vi.mocked(sitemapEntries).mockRejectedValue(new Error("timeout"));
  const r = await GET();
  expect(r.status).toBe(503);
  expect(r.headers.get("cache-control")).toBe("no-store");
  expect(await r.text()).not.toContain("<urlset");
});
it("escapes verified URLs and avoids persistent sitemap caching", async () => {
  vi.mocked(sitemapEntries).mockResolvedValue([{ url: "https://example.com/?a=1&b=2" }]);
  const r = await GET();
  expect(r.status).toBe(200);
  expect(await r.text()).toContain("?a=1&amp;b=2");
  expect(r.headers.get("cache-control")).toBe("no-store");
});
