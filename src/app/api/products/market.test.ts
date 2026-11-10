// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const deps = vi.hoisted(() => ({ products: vi.fn(), series: vi.fn(), detail: vi.fn() }));
vi.mock("@/lib/geo", () => ({ pickCountry: () => "SG" }));
vi.mock("@/server/catalog/live", () => ({
  getLiveProducts: deps.products,
  getLiveSeriesList: deps.series,
  getLiveProductByCode: deps.detail,
}));
import { GET as list } from "./route";
import { GET as detail } from "./[code]/route";
beforeEach(() => {
  vi.resetAllMocks();
  deps.products.mockResolvedValue([]);
  deps.series.mockResolvedValue([]);
  deps.detail.mockResolvedValue(null);
});
it("rejects stale bag list and detail reads before querying Shopify", async () => {
  const request = new Request("https://isoffy.com/api/products", {
    headers: { "X-Offy-Expected-Country": "GB" },
  });
  expect((await list(request)).status).toBe(409);
  expect((await detail(request, { params: Promise.resolve({ code: "wild" }) })).status).toBe(409);
  expect(deps.products).not.toHaveBeenCalled();
  expect(deps.series).not.toHaveBeenCalled();
  expect(deps.detail).not.toHaveBeenCalled();
});
it("accepts matching destinations and preserves compatibility for ordinary catalog reads", async () => {
  for (const expected of [undefined, "SG"])
    expect(
      (
        await list(
          new Request("https://isoffy.com/api/products", {
            headers: expected ? { "X-Offy-Expected-Country": expected } : undefined,
          }),
        )
      ).status,
    ).toBe(200);
  expect(deps.products).toHaveBeenCalledWith("SG");
});
