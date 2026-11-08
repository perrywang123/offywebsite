import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MetaDiagnostics } from "./MetaDiagnostics";
afterEach(() => vi.unstubAllGlobals());
it("distinguishes platform acceptance from purchase attribution and handles an empty list", async () => {
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      config: {
        enabled: true,
        pixelId: "1120625754196383",
        capi: false,
        catalogCount: 0,
        testMode: false,
      },
      total: 0,
      rows: [],
    }),
  });
  vi.stubGlobal("fetch", fetcher);
  render(<MetaDiagnostics />);
  expect(await screen.findByText("暂无匹配事件")).toBeVisible();
  expect(screen.getByText(/不代表广告归因/)).toBeVisible();
  expect(screen.getByText(/Purchase 由 Shopify/)).toBeVisible();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
