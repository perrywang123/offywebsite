// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/server/catalog/live", () => ({
  getLiveProducts: vi.fn(),
  getLiveSeriesList: vi.fn(),
  getLiveProductByCode: vi.fn(),
}));
import { getLiveProducts, getLiveSeriesList, getLiveProductByCode } from "@/server/catalog/live";
import { GET } from "./route";
import { GET as detail } from "./[code]/route";
beforeEach(() => vi.resetAllMocks());
it("returns uncached 503 for outages, never a successful empty list", async () => {
  vi.mocked(getLiveProducts).mockRejectedValue(new Error("timeout"));
  vi.mocked(getLiveSeriesList).mockResolvedValue([]);
  const r = await GET(new Request("http://localhost/api/products"));
  expect(r.status).toBe(503);
  expect(r.headers.get("cache-control")).toContain("no-store");
  expect(await r.json()).toEqual({ error: "catalog_unavailable" });
});
it("distinguishes a successful empty catalog", async () => {
  vi.mocked(getLiveProducts).mockResolvedValue([]);
  vi.mocked(getLiveSeriesList).mockResolvedValue([]);
  const r = await GET(new Request("http://localhost/api/products"));
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual({ products: [], categories: [] });
});
it("uses 404 only for confirmed absence and 503 for a failed product lookup", async () => {
  const req = new Request("http://localhost/api/products/x"),
    ctx = { params: Promise.resolve({ code: "x" }) };
  vi.mocked(getLiveProductByCode).mockResolvedValue(undefined);
  expect((await detail(req, ctx)).status).toBe(404);
  vi.mocked(getLiveProductByCode).mockRejectedValue(new Error("timeout"));
  const r = await detail(req, ctx);
  expect(r.status).toBe(503);
  expect(r.headers.get("cache-control")).toContain("no-store");
});
