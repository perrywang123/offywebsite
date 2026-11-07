import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CollabsWorkspace } from "./CollabsWorkspace";
import userEvent from "@testing-library/user-event";
afterEach(() => vi.unstubAllGlobals());
it("explains official evidence, fresh empty state, and directs creators to the official portal", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
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
const unboundCreator = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Maya",
  alias: "maya",
  creatorKey: null,
  officialLink: "https://isoffy.com/products?dt_id=test-only",
  enabled: true,
  createdAt: 1,
  updatedAt: 1,
};
it("creates a short link without a report identity and discloses pending matching", async () => {
  const user = userEvent.setup();
  const posted: Record<string, unknown>[] = [];
  const mock = vi.fn(async (_url: string, options?: RequestInit) => {
    if (options?.method === "POST") posted.push(JSON.parse(String(options.body)));
    return Response.json({
      creators: posted.length ? [unboundCreator] : [],
      reports: [],
      officialAdmin: "https://admin.shopify.com/store/test/apps/collabs",
      creatorPortal: "https://collabs.shopify.com/",
    });
  });
  vi.stubGlobal("fetch", mock);
  render(<CollabsWorkspace siteUrl="https://isoffy.com" />);
  await user.click(await screen.findByRole("button", { name: "新增链接记录" }));
  const reportIdentity = screen.getByLabelText(/^报告中的创作者标识（可后补）/);
  expect(reportIdentity).not.toBeRequired();
  await user.type(screen.getByLabelText("达人名称"), "Maya");
  await user.type(screen.getByLabelText(/^固定推广别名/), "maya");
  await user.type(screen.getByLabelText("Collabs 官方推广链接"), unboundCreator.officialLink);
  await user.click(screen.getByRole("button", { name: "保存链接记录" }));
  expect(await screen.findByText(/报告标识待绑定/)).toBeInTheDocument();
  expect(posted).toEqual([
    expect.objectContaining({ alias: "maya", creatorKey: null, enabled: true }),
  ]);
  expect(screen.getByText(/暂不进行按创作者核对/)).toBeInTheDocument();
});
it("allows a pending report identity to be supplied but locks a bound identity", async () => {
  const user = userEvent.setup();
  let creator = { ...unboundCreator, creatorKey: null as string | null };
  const posted: Record<string, unknown>[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, options?: RequestInit) => {
      if (options?.method === "POST") {
        const body = JSON.parse(String(options.body));
        posted.push(body);
        creator = { ...creator, ...body };
      }
      return Response.json({ creators: [creator], reports: [] });
    }),
  );
  render(<CollabsWorkspace siteUrl="https://isoffy.com" />);
  await user.click(await screen.findByRole("button", { name: "编辑链接" }));
  const field = screen.getByLabelText(/^报告中的创作者标识（可后补）/);
  expect(field).not.toHaveAttribute("readonly");
  await user.type(field, "Maya-from-report");
  await user.click(screen.getByRole("button", { name: "保存链接记录" }));
  expect(await screen.findByText("来源标识：Maya-from-report")).toBeInTheDocument();
  expect(posted[0]).toMatchObject({
    id: creator.id,
    alias: "maya",
    creatorKey: "Maya-from-report",
  });
  await user.click(screen.getByRole("button", { name: "编辑链接" }));
  expect(screen.getByLabelText(/^报告中的创作者标识（可后补）/)).toHaveAttribute("readonly");
  expect(screen.getByLabelText(/^固定推广别名/)).toHaveAttribute("readonly");
});
it("discloses historical duplicate tracking links without disabling them", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        creators: [unboundCreator, { ...unboundCreator, id: "another", alias: "maya-test" }],
        reports: [],
      }),
    ),
  );
  render(<CollabsWorkspace siteUrl="https://isoffy.com" />);
  const warning = await screen.findByText(/推广标识重复：dt_id=test-only/);
  expect(warning).toHaveTextContent("推广标识重复：dt_id=test-only");
  expect(warning).toHaveTextContent("/r/maya、/r/maya-test");
  expect(screen.getAllByText(/短链已启用/)).toHaveLength(2);
});
it("explains a rejected duplicate binding and preserves the entered form", async () => {
  const user = userEvent.setup();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, options?: RequestInit) =>
      options?.method === "POST"
        ? Response.json({ error: "official_tracking_already_bound" }, { status: 409 })
        : Response.json({ creators: [], reports: [] }),
    ),
  );
  render(<CollabsWorkspace siteUrl="https://isoffy.com" />);
  await user.click(await screen.findByRole("button", { name: "新增链接记录" }));
  await user.type(screen.getByLabelText("达人名称"), "Maya");
  await user.type(screen.getByLabelText(/^固定推广别名/), "maya");
  await user.type(screen.getByLabelText("Collabs 官方推广链接"), unboundCreator.officialLink);
  await user.click(screen.getByRole("button", { name: "保存链接记录" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "该官方 dt_id 或优惠码已绑定其他合作记录",
  );
  expect(screen.getByLabelText("达人名称")).toHaveValue("Maya");
  expect(screen.getByLabelText("Collabs 官方推广链接")).toHaveValue(unboundCreator.officialLink);
});
