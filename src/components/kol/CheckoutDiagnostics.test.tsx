import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckoutDiagnostics } from "./CheckoutDiagnostics";
const row = {
  id: "49e5637c-3cdf-4cac-b830-b91763063cc2",
  createdAt: 1800000000000,
  updatedAt: 1800000000100,
  status: "redirect_ready",
  country: "US",
  countryEvidence: {
    country: "US",
    source: "header",
    header: "cf-ipcountry",
    candidates: [{ header: "cf-ipcountry", value: "US" }],
    ipSource: null,
    fallback: "US",
  },
  items: [{ code: "wild-sweetie", quantity: 2 }],
  locale: "en",
  pagePath: "/cart",
  error: null,
  durationMs: 100,
  redirectHost: "shop.test",
  sensitiveExpiresAt: Date.now() + 86400000,
};
afterEach(() => vi.unstubAllGlobals());
describe("checkout diagnostic administration", () => {
  it("filters server data, opens an evidence timeline and reveals/copies the original link only on request", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const fetcher = vi.fn(async (url: string) =>
      Response.json(
        url.endsWith("/reveal")
          ? { checkoutUrl: "https://shop.test/checkout?key=secret", responses: [] }
          : url.includes(row.id)
            ? { ...row, events: [{ id: 1, at: row.createdAt, type: "server_received", data: {} }] }
            : { rows: [row], total: 1, page: 1, pageSize: 25 },
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    render(<CheckoutDiagnostics />);
    expect(await screen.findByText("wild-sweetie × 2")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("国家代码"), { target: { value: "gb" } });
    fireEvent.click(screen.getByRole("button", { name: "筛选记录" }));
    await waitFor(() =>
      expect(fetcher).toHaveBeenLastCalledWith(
        expect.stringContaining("country=GB"),
        expect.anything(),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "查看详情" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("服务端收到结账请求")).toBeInTheDocument();
    expect(screen.queryByText("https://shop.test/checkout?key=secret")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "查看完整链接与响应" }));
    expect(
      await screen.findByDisplayValue("https://shop.test/checkout?key=secret"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "复制结账链接" }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("https://shop.test/checkout?key=secret"),
    );
    fireEvent.click(screen.getByRole("button", { name: "关闭结账详情" }));
    expect(screen.getByRole("button", { name: "查看详情" })).toHaveFocus();
  });
  it("distinguishes read errors from an empty result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => Response.json({ error: "failed" }, { status: 503 })),
    );
    render(<CheckoutDiagnostics />);
    expect(await screen.findByRole("alert")).toHaveTextContent("读取失败");
    expect(screen.queryByText("暂无结账记录")).not.toBeInTheDocument();
  });
});
