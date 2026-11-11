// @vitest-environment node
import { expect, it, vi } from "vitest";
vi.mock("@/server/catalog/live", () => ({
  getLiveProducts: vi.fn().mockResolvedValue([]),
  getLiveSeriesList: vi.fn().mockResolvedValue([]),
}));
import { sitemapEntries } from "./sitemap";

it("lists both the stable About entry and the independently addressable story", async () => {
  const urls = (await sitemapEntries()).map((entry) => new URL(entry.url).pathname);
  expect(urls).toContain("/about");
  expect(urls).toContain("/our-story");
  expect(urls.filter((url) => url === "/our-story")).toHaveLength(1);
});
