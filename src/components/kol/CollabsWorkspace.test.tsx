import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CollabsWorkspace } from "./CollabsWorkspace";
afterEach(() => vi.unstubAllGlobals());
it("explains official evidence, fresh empty state, and directs creators to the official portal", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            creators: [],
            reports: [],
            officialAdmin: "https://admin.shopify.com/store/test/apps/collabs",
            creatorPortal: "https://collabs.shopify.com/",
          }),
        ),
      ),
  );
  render(<CollabsWorkspace siteUrl="https://isoffy.com" />);
  expect(await screen.findByText("尚未导入官方报表")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /KOL 官方门户/ })).toHaveAttribute(
    "href",
    "https://collabs.shopify.com/",
  );
  expect(screen.getByText(/Offy 不生成应付佣金/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "导入报告" })).toBeEnabled();
});
it("reports load failure without showing zero earnings", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
  render(<CollabsWorkspace siteUrl="https://isoffy.com" />);
  expect(await screen.findByRole("alert")).toHaveTextContent("暂时无法读取");
  expect(screen.queryByText("尚未导入官方报表")).not.toBeInTheDocument();
});
