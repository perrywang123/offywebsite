// @vitest-environment node
import { expect, it, vi } from "vitest";
import { getMarketCountries } from "./localization";
const response = (rows: unknown[]) =>
  new Response(JSON.stringify({ data: { localization: { availableCountries: rows } } }));
it("uses live currencies and supported destinations in priority order", async () => {
  const fetcher = vi.fn(async () =>
    response([
      { isoCode: "SG", name: "Singapore", currency: { isoCode: "SGD" } },
      { isoCode: "US", name: "United States", currency: { isoCode: "USD" } },
    ]),
  );
  expect(await getMarketCountries(fetcher)).toEqual([
    { code: "US", name: "United States", currency: "USD" },
    { code: "SG", name: "Singapore", currency: "SGD" },
  ]);
});
it("rejects invalid or empty settings without fabricating a currency list", async () => {
  await expect(getMarketCountries(async () => response([]))).rejects.toThrow("catalog_unavailable");
  await expect(
    getMarketCountries(async () =>
      response([{ isoCode: "QQ", name: "Unknown", currency: { isoCode: "USD" } }]),
    ),
  ).rejects.toThrow("catalog_unavailable");
});
