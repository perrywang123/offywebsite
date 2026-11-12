import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MetaAnalyticsCharts } from "./MetaAnalyticsCharts";
import type { MetaAnalyticsData } from "@/server/meta/analytics";
const now = Date.parse("2026-11-13T12:00:00Z");
const counts = {
  PageView: { events: 12, browsers: 4 },
  ViewContent: { events: 8, browsers: 3 },
  AddToCart: { events: 2, browsers: 2 },
  CheckoutReady: { events: 3, browsers: 2 },
};
const data: MetaAnalyticsData = {
  generatedAt: now,
  range: { from: now - 86400000, to: now, timeZone: "Asia/Shanghai" },
  scope: { source: "all", adId: "", campaignId: "", includeTests: false },
  totals: counts,
  daily: [{ day: "2026-11-12", metrics: counts }],
  funnel: { view: 4, content: 3, cart: 2, checkout: 2, paid: 1, orders: 2 },
  currencies: [],
  ads: [{ adId: null, funnel: { view: 4, content: 3, cart: 2, checkout: 2, paid: 1, orders: 2 } }],
  adGroupCount: 1,
  health: {
    capi: { total: 2, sent: 1, pending: 1, failed: 0, unconfigured: 0 },
    labelledVisitors: 0,
    visitBrowsers: 4,
  },
};
const sync = { lastSuccess: now, lastError: null, nextAt: now, scanning: false };
function setup(overrides: Partial<React.ComponentProps<typeof MetaAnalyticsCharts>> = {}) {
  const onStage = vi.fn(),
    onAd = vi.fn();
  render(
    <MetaAnalyticsCharts
      data={data}
      enabled
      ordersConfigured
      sync={sync}
      onStage={onStage}
      onAd={onAd}
      {...overrides}
    />,
  );
  return { onStage, onAd };
}
describe("visual marketing diagnostics", () => {
  it("switches trend metrics/units and offers exact daily values", () => {
    setup();
    const trend = screen.getByRole("region", { name: "访问与关键行为趋势" });
    fireEvent.click(within(trend).getByRole("button", { name: "加购" }));
    fireEvent.click(within(trend).getByRole("button", { name: "事件次数" }));
    expect(within(trend).getByRole("img")).toHaveAccessibleName(/加购.*次数/);
    fireEvent.click(within(trend).getByText("查看每日数值"));
    expect(within(trend).getByRole("table")).toHaveTextContent("2026-11-12");
  });
  it("drills into stages and labelled/unlabelled ad groups without treating cart as required", () => {
    const { onStage, onAd } = setup();
    expect(screen.getByText(/Buy Now 可跳过加购/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /查看结账准备阶段证据/ }));
    expect(onStage).toHaveBeenCalledWith("checkout");
    expect(screen.getByText("未记录广告 ID")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "核对未记录广告 ID 的链路" }));
    expect(onAd).toHaveBeenCalledWith(null);
  });
  it("never labels unknown or stale Shopify sync as zero paid conversions", () => {
    setup({ sync: { ...sync, lastSuccess: now - 46 * 60000 } });
    expect(screen.getByRole("button", { name: /查看关联付款阶段证据/ })).toBeDisabled();
    expect(screen.getByText(/订单证据已过期/)).toBeVisible();
    expect(screen.queryByText("25.00%")).not.toBeInTheDocument();
  });
  it("does not display a perfect delivery rate when there are no jobs", () => {
    setup({
      data: {
        ...data,
        health: {
          ...data.health,
          capi: { total: 0, sent: 0, pending: 0, failed: 0, unconfigured: 2 },
        },
      },
    });
    expect(screen.getByText(/暂无应发送的加购任务/)).toBeVisible();
    expect(screen.queryByText("100.0% 已接收")).not.toBeInTheDocument();
  });
  it("shows unavailable tracking as unknown and preserves the Meta report boundary", () => {
    setup({ enabled: false, ordersConfigured: false });
    expect(screen.getByText(/站内追踪未启用/)).toBeVisible();
    expect(screen.getByText(/CAPI 已接收不代表广告归因成功/)).toBeVisible();
  });
});
