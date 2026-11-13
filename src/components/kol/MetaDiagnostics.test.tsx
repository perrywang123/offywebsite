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
  expect(screen.getByText(/不代表 Meta 最终归因/)).toBeVisible();
  expect(screen.getByText(/来源为最后记录的有效标签/)).toBeVisible();
  expect(screen.getByText(/Purchase 由 Shopify/)).toBeVisible();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("excludes internal tests by default and only includes them after an explicit selection", async () => {
  const fetcher = vi.fn().mockResolvedValue({
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
  expect(fetcher).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "应用筛选" }));
  await waitFor(() => expect(fetcher.mock.calls.at(-1)?.[0]).toContain("includeTests=true"));
});

it("applies global source/advertising filters together and keeps event filters local to evidence", async () => {
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ config: { enabled: true }, total: 0, rows: [] }),
  });
  vi.stubGlobal("fetch", fetcher);
  render(<MetaDiagnostics />);
  await screen.findByText("暂无匹配事件");
  fireEvent.change(screen.getByLabelText("流量范围"), { target: { value: "ad" } });
  fireEvent.change(screen.getByLabelText("广告 ID", { exact: true }), {
    target: { value: "1234567" },
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "应用筛选" }));
  await waitFor(() => expect(fetcher.mock.calls.at(-1)?.[0]).toContain("adId=1234567"));
  expect(fetcher.mock.calls.at(-1)?.[0]).toContain("source=ad");
  fireEvent.change(screen.getByLabelText("事件", { exact: true }), {
    target: { value: "AddToCart" },
  });
  await waitFor(() => expect(fetcher.mock.calls.at(-1)?.[0]).toContain("name=AddToCart"));
  expect(fetcher.mock.calls.at(-1)?.[0]).toContain("adId=1234567");
  expect(fetcher.mock.calls.every((call) => !call[1]?.method || call[1].method === "GET")).toBe(
    true,
  );
});

it("preserves the last successful snapshot on failure and can retry without losing the scope", async () => {
  const response = {
    ok: true,
    json: async () => ({ config: { enabled: true }, total: 0, rows: [] }),
  };
  const fetcher = vi.fn().mockResolvedValueOnce(response).mockResolvedValueOnce({ ok: false });
  vi.stubGlobal("fetch", fetcher);
  render(<MetaDiagnostics />);
  await screen.findByText("暂无匹配事件");
  fireEvent.click(screen.getByRole("button", { name: "刷新数据" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("广告诊断暂时读取失败");
  expect(screen.getByText("读取失败，保留上次快照；请刷新后再核对。")).toBeVisible();
  expect(screen.getByText("暂无匹配事件")).toBeVisible();
  fetcher.mockResolvedValueOnce(response);
  fireEvent.click(screen.getByRole("button", { name: "刷新数据" }));
  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  expect(fetcher.mock.calls[0][0]).toBe(fetcher.mock.calls.at(-1)?.[0]);
});
