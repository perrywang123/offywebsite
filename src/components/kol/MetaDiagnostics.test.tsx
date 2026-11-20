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

it("looks up a Shopify order by number and exposes payment and checkout dates with the full ad ID", async () => {
  const adId = "120100000000000001";
  const fetcher = vi.fn(async (url: string) => ({
    ok: true,
    json: async () =>
      url.includes("/meta/orders?")
        ? {
            rows: url.includes("orderNumber=")
              ? [
                  {
                    orderId: "gid://shopify/Order/1000",
                    orderName: "#1000",
                    source: { ad_id: adId },
                    checkoutAt: Date.parse("2026-11-18T15:59:00Z"),
                    paidAt: Date.parse("2026-11-18T16:02:00Z"),
                    financialStatus: "PAID",
                    test: false,
                    canceled: false,
                    currency: "USD",
                    totalMinor: 4590,
                    refundedMinor: 0,
                  },
                ]
              : [],
            total: url.includes("orderNumber=") ? 1 : 0,
            page: 1,
            pageSize: 25,
            currencies: [],
          }
        : { config: { enabled: true }, total: 0, rows: [] },
  }));
  vi.stubGlobal("fetch", fetcher);
  render(<MetaDiagnostics />);
  await screen.findByText("暂无匹配事件");
  expect(fetcher).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "查订单来源" }));
  fireEvent.change(screen.getByLabelText("订单日期口径"), { target: { value: "payment" } });
  await waitFor(() => expect(fetcher.mock.calls.at(-1)?.[0]).toContain("basis=payment"));
  fireEvent.change(screen.getByLabelText("Shopify 订单号"), { target: { value: "#1000" } });
  fireEvent.click(screen.getByRole("button", { name: "查询订单" }));
  expect(await screen.findByText(adId)).toBeVisible();
  expect(screen.getByText("#1000")).toBeVisible();
  expect(screen.getByText("结账时间")).toBeVisible();
  expect(screen.getByText("Shopify 付款时间")).toBeVisible();
  expect(new URLSearchParams(fetcher.mock.calls.at(-1)?.[0].split("?")[1]).get("orderNumber")).toBe(
    "#1000",
  );
});

it.each([{ id: "120100000000000003" }, { id: undefined }])(
  "shows the Shop order and its actual evidence without an Offy checkout",
  async ({ id }) => {
    const fetcher = vi.fn(async (url: string) => ({
      ok: true,
      json: async () =>
        url.includes("/meta/orders?")
          ? {
              rows: [],
              total: 0,
              pageSize: 25,
              currencies: [],
              shopifyLookup: url.includes("orderNumber=")
                ? {
                    status: "found",
                    orderId: "gid://shopify/Order/1001",
                    orderName: "#1001",
                    salesChannel: "Shop",
                    financialStatus: "PAID",
                    placedAt: Date.parse("2026-11-19T16:04:00Z"),
                    journey: "complete",
                    hasMetaClick: false,
                    ad: id ? { id, at: Date.parse("2026-11-19T16:03:00Z") } : null,
                  }
                : undefined,
            }
          : { config: { enabled: true }, total: 0, rows: [] },
    }));
    vi.stubGlobal("fetch", fetcher);
    render(<MetaDiagnostics />);
    await screen.findByText("暂无匹配事件");
    fireEvent.click(screen.getByRole("button", { name: "查订单来源" }));
    fireEvent.change(screen.getByLabelText("Shopify 订单号"), { target: { value: "#1001" } });
    fireEvent.click(screen.getByRole("button", { name: "查询订单" }));
    expect(await screen.findByText("Shop", { exact: true })).toBeVisible();
    expect(screen.getByText(id ?? "广告来源未确认")).toBeVisible();
    expect(screen.queryByText("结账时间", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText(/共 0 笔/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "复制广告 ID" }) !== null).toBe(Boolean(id));
  },
);
