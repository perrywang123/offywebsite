import { act, render, screen, within } from "@testing-library/react";
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
  expect(screen.getByRole("link", { name: "contact@whimcoreofficial.com" })).toHaveAttribute(
    "href",
    "mailto:contact@whimcoreofficial.com",
  );
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
it("requires explicit archival confirmation, removes a record and restores it without enabling its link", async () => {
  const user = userEvent.setup();
  let archived = false;
  const posts: Array<{ url: string; body: Record<string, unknown> }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, options?: RequestInit) => {
      if (options?.method === "POST") {
        posts.push({ url, body: JSON.parse(String(options.body)) });
        archived = url.endsWith("/archive");
      }
      return Response.json({
        creators: archived ? [] : [{ ...unboundCreator, enabled: posts.length ? false : true }],
        archivedCreators: archived
          ? [
              {
                ...unboundCreator,
                enabled: false,
                archivedAt: 1,
                archiveReason: "test",
                archiveNote: "",
                archivedBy: "owner",
              },
            ]
          : [],
        reports: [],
      });
    }),
  );
  render(<CollabsWorkspace siteUrl="https://isoffy.com" />);
  await user.click(await screen.findByRole("button", { name: "归档合作" }));
  expect(screen.getByRole("heading", { name: "归档 Maya" })).toBeInTheDocument();
  expect(screen.getByText(/不会终止 Collabs 合作/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "确认归档" })).toBeDisabled();
  await user.selectOptions(screen.getByLabelText("归档原因"), "test");
  await user.click(screen.getByLabelText(/已确认归档对象/));
  await user.click(screen.getByRole("button", { name: "确认归档" }));
  expect(await screen.findByText("尚未关联 Collabs 合作链接")).toBeInTheDocument();
  expect(posts[0]).toMatchObject({
    url: "/api/admin/kol/collabs/archive",
    body: { id: unboundCreator.id, reason: "test", confirmed: true },
  });
  await user.click(screen.getByText(/已归档合作（1）/));
  await user.click(screen.getByRole("button", { name: "恢复到合作列表" }));
  expect(await screen.findByText(/短链已停用/)).toBeInTheDocument();
  expect(posts[1]).toMatchObject({
    url: "/api/admin/kol/collabs/restore",
    body: { id: unboundCreator.id },
  });
});
it("keeps the observation archive scope when changing periods and after refreshing", async () => {
  const user = userEvent.setup();
  const mock = vi.fn<typeof fetch>(async () =>
    Response.json({ creators: [], archivedCreators: [], reports: [] }),
  );
  vi.stubGlobal("fetch", mock);
  render(<CollabsWorkspace siteUrl="https://isoffy.com" />);
  await user.click(await screen.findByLabelText("包含已归档的访问统计"));
  expect(mock).toHaveBeenCalledWith("/api/admin/kol/collabs?includeArchived=1", expect.anything());
  await user.click(screen.getByRole("button", { name: "刷新数据" }));
  expect(mock.mock.calls.at(-1)?.[0]).toBe("/api/admin/kol/collabs?includeArchived=1");
});
it("cannot resurrect archived observations when an older period request finishes late", async () => {
  const user = userEvent.setup();
  let archived = false;
  let finishLate: (() => void) | undefined;
  const metrics = {
    days: 30,
    from: "2026-10-16",
    to: "2026-11-14",
    timezone: "UTC",
    links: [
      {
        id: unboundCreator.id,
        name: "Maya",
        alias: "maya",
        enabled: true,
        total: 1,
        periodTotal: 1,
        firstAt: 1,
        lastAt: 1,
        daily: [{ day: "2026-11-14", count: 1 }],
      },
    ],
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, options?: RequestInit) => {
      if (url.includes("/links?"))
        return new Promise<Response>((resolve) => {
          finishLate = () => resolve(Response.json({ ...metrics, days: 7 }));
        });
      if (options?.method === "POST") archived = true;
      return Response.json({
        creators: archived ? [] : [unboundCreator],
        archivedCreators: archived
          ? [
              {
                ...unboundCreator,
                enabled: false,
                archivedAt: 1,
                archiveReason: "test",
                archiveNote: "",
                archivedBy: "owner",
              },
            ]
          : [],
        reports: [],
        linkMetrics: { ...metrics, links: archived ? [] : metrics.links },
      });
    }),
  );
  render(<CollabsWorkspace siteUrl="https://isoffy.com" />);
  const region = await screen.findByRole("region", { name: "Offy 短链统计" });
  await user.selectOptions(within(region).getByRole("combobox"), "7");
  await user.click(screen.getByRole("button", { name: "归档合作" }));
  await user.selectOptions(screen.getByLabelText("归档原因"), "test");
  await user.click(screen.getByLabelText(/已确认归档对象/));
  await user.click(screen.getByRole("button", { name: "确认归档" }));
  await screen.findByText("尚未关联 Collabs 合作链接");
  expect(finishLate).toBeDefined();
  await act(async () => {
    finishLate?.();
  });
  expect(
    within(screen.getByRole("region", { name: "Offy 短链统计" })).queryByRole("button", {
      name: /Maya/,
    }),
  ).not.toBeInTheDocument();
});
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
