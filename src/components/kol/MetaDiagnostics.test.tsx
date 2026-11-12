import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
it("excludes internal tests by default and only includes them after an explicit selection", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue({
      ok: true,
      json: async () => ({
        config: {
          enabled: true,
          pixelId: "1120625754196383",
          capi: true,
          catalogCount: 41,
          testMode: false,
        },
        total: 0,
        rows: [],
      }),
    });
  vi.stubGlobal("fetch", fetcher);
  render(<MetaDiagnostics />);
  await screen.findByText("暂无匹配事件");
  const check = screen.getByRole("checkbox", { name: /包含内部测试/ });
  expect(check).not.toBeChecked();
  fireEvent.click(check);
  await waitFor(() => expect(fetcher.mock.calls.at(-1)?.[0]).toContain("includeTests=true"));
});
