import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import { AdminConsole } from "./AdminConsole";
// jsdom does not implement the native dialog open/close lifecycle.
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
const emptyState = {
  partners: [],
  codes: [],
  jobs: [],
  orders: [],
  settlements: [],
  balances: [],
  audit: [],
  health: { shopifyAdminConfigured: false, inbox: [], failures: [] },
  admin: { email: "local@example.com" },
  siteUrl: "https://offy.test",
  settlementsEnabled: false,
};
it("labels order filters, explains inverted dates and clears only the current section", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => Response.json(emptyState)),
  );
  render(<AdminConsole view="orders" />);
  await screen.findByRole("navigation", { name: "后台导航" });
  expect(screen.getByLabelText("合作达人").closest("label")).toHaveTextContent("合作达人");
  expect(screen.getByLabelText("交易币种").closest("label")).toHaveTextContent("交易币种");
  fireEvent.change(screen.getByLabelText("搜索"), { target: { value: "#1001" } });
  fireEvent.change(screen.getByLabelText("付款起日"), { target: { value: "2026-11-05" } });
  fireEvent.change(screen.getByLabelText("付款止日"), { target: { value: "2026-11-04" } });
  expect(screen.getByRole("alert")).toHaveTextContent("付款止日不能早于付款起日");
  expect(screen.queryByText("暂无匹配订单")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "清空筛选" }));
  expect(screen.getByLabelText("搜索")).toHaveValue("");
  expect(screen.getByLabelText("付款起日")).toHaveValue("");
  expect(screen.getByLabelText("付款止日")).toHaveValue("");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
it("toggles order filters and keeps selected conditions visible while collapsed", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => Response.json(emptyState)),
  );
  render(<AdminConsole view="orders" />);
  await screen.findByRole("navigation", { name: "后台导航" });
  const toggle = screen.getByRole("button", { name: /筛选条件/ });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByLabelText("搜索").closest(".toolbar")).toHaveClass("orders-toolbar");
  expect(document.getElementById("order-filters")).toHaveClass("filters");
  expect(document.getElementById("order-filters")).not.toHaveClass("is-expanded");
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(document.getElementById("order-filters")).toHaveClass("filters", "is-expanded");
  fireEvent.change(screen.getByLabelText("付款起日"), { target: { value: "2026-11-04" } });
  fireEvent.click(toggle);
  expect(screen.getByText(/已选：付款自 2026-11-04/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /筛选条件（1项）/ })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});
it.each(["codes", "settlements"] as const)(
  "shows an actionable no-match state for existing %s",
  async (view) => {
    const fixture = {
      ...emptyState,
      codes: [
        {
          id: "code-1",
          kolId: "kol-1",
          normalized: "MAYA-10",
          source: "existing",
          status: "ended",
          remoteStatus: "ACTIVE",
          summary: "Test campaign",
          campaignId: "campaign-1",
          syncedAt: null,
        },
      ],
      settlements: [
        {
          id: "batch-1",
          kolId: "kol-1",
          month: "2026-10",
          currency: "USD",
          total: -250,
          status: "canceled",
          paymentRef: null,
          paidAt: null,
          paymentNote: null,
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => Response.json(fixture)),
    );
    render(<AdminConsole view={view} />);
    await screen.findByRole("navigation", { name: "后台导航" });
    fireEvent.change(screen.getByLabelText("搜索"), { target: { value: "missing" } });
    expect(
      screen.getByRole("heading", {
        name: view === "codes" ? "未找到匹配优惠码" : "未找到匹配结算批次",
      }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "清空筛选" })[0]);
    expect(screen.getByText(view === "codes" ? "MAYA-10" : "USD -2.50")).toBeInTheDocument();
  },
);
it("keeps the secondary task empty state compact", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => Response.json(emptyState)),
  );
  render(<AdminConsole view="codes" />);
  const heading = await screen.findByRole("heading", { name: "没有发码任务" });
  expect(heading.closest("div")).toHaveClass("empty", "compact");
});
it("identifies the order and its amount before a consequential confirmation", async () => {
  const fixture = {
    ...emptyState,
    orders: [
      {
        id: "order-1",
        name: "#1001",
        kolId: null,
        currency: "USD",
        net: 9000,
        commission: 900,
        rateBps: 1000,
        status: "verified",
        evidence: "{}",
        reason: null,
        paidAt: null,
        checkedAt: null,
        holdUntil: null,
      },
    ],
  };
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => Response.json(fixture)),
  );
  render(<AdminConsole view="orders" />);
  fireEvent.click(await screen.findByRole("button", { name: "标记待核查" }));
  const dialog = screen.getByRole("dialog", { name: "人工冻结待核查" });
  expect(within(dialog).getByText("#1001")).toBeInTheDocument();
  expect(within(dialog).getByText("USD 90.00")).toBeInTheDocument();
});
it("shows a dialog error once and starts the next operation without the previous error", async () => {
  const fixture = {
    ...emptyState,
    partners: [{ id: "kol-1", name: "Maya", alias: "maya", status: "active" }],
  };
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(async (url: string) =>
        url.endsWith("/connection")
          ? Response.json({ scopes: [], campaigns: { nodes: [], truncated: false } })
          : url.endsWith("/codes/bind")
            ? Response.json({ error: "code_not_found" }, { status: 409 })
            : Response.json(fixture),
      ),
  );
  render(<AdminConsole view="codes" />);
  fireEvent.click(await screen.findByRole("button", { name: "绑定已有码" }));
  let dialog = screen.getByRole("dialog", { name: "绑定 Shopify 已有码" });
  fireEvent.change(within(dialog).getByLabelText("合作达人"), { target: { value: "kol-1" } });
  fireEvent.change(within(dialog).getByLabelText("已有优惠码"), {
    target: { value: "MISSING-CODE" },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "核验并绑定" }));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent("Shopify中未找到此码");
  expect(screen.getAllByRole("alert")).toHaveLength(1);
  fireEvent.click(within(dialog).getByRole("button", { name: "关闭" }));
  fireEvent.click(screen.getByRole("button", { name: "绑定已有码" }));
  dialog = screen.getByRole("dialog", { name: "绑定 Shopify 已有码" });
  expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
});
it("keeps the frame and independent filters while refreshing a different section", async () => {
  let finish!: (response: Response) => void;
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json(emptyState))
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValue(Response.json(emptyState));
  vi.stubGlobal("fetch", fetcher);
  const { rerender } = render(<AdminConsole view="partners" />);
  const navigation = await screen.findByRole("navigation", { name: "后台导航" });
  fireEvent.change(screen.getByLabelText("搜索"), { target: { value: "maya" } });
  rerender(<AdminConsole view="orders" />);
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  expect(screen.getByRole("navigation", { name: "后台导航" })).toBe(navigation);
  expect(screen.queryByText("正在连接合作账簿…")).not.toBeInTheDocument();
  expect(screen.getByLabelText("搜索")).toHaveValue("");
  fireEvent.change(screen.getByLabelText("搜索"), { target: { value: "#1001" } });
  await act(async () => finish(Response.json(emptyState)));
  rerender(<AdminConsole view="partners" />);
  expect(screen.getByLabelText("搜索")).toHaveValue("maya");
});
it("keeps previous data on a failed background refresh but clears it for expired authentication", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json(emptyState))
    .mockResolvedValueOnce(Response.json({ error: "operation_failed" }, { status: 503 }))
    .mockResolvedValueOnce(Response.json({ error: "login_required" }, { status: 401 }));
  vi.stubGlobal("fetch", fetcher);
  const { rerender } = render(<AdminConsole view="partners" />);
  await screen.findByRole("navigation", { name: "后台导航" });
  rerender(<AdminConsole view="orders" />);
  expect(await screen.findByRole("alert")).toHaveTextContent("当前显示上次读取的数据");
  expect(screen.getByRole("navigation", { name: "后台导航" })).toBeInTheDocument();
  rerender(<AdminConsole view="codes" />);
  expect(await screen.findByLabelText("管理员邮箱")).toBeInTheDocument();
  expect(screen.queryByRole("navigation", { name: "后台导航" })).not.toBeInTheDocument();
});
it("ignores a superseded snapshot after a newer unauthorized response", async () => {
  let finish!: (response: Response) => void;
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json(emptyState))
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValueOnce(Response.json({ error: "login_required" }, { status: 401 }));
  vi.stubGlobal("fetch", fetcher);
  const { rerender } = render(<AdminConsole view="partners" />);
  await screen.findByRole("navigation", { name: "后台导航" });
  rerender(<AdminConsole view="orders" />);
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  const signal = fetcher.mock.calls[1][1].signal as AbortSignal;
  rerender(<AdminConsole view="codes" />);
  expect(await screen.findByLabelText("管理员邮箱")).toBeInTheDocument();
  expect(signal.aborted).toBe(true);
  await act(async () => finish(Response.json(emptyState)));
  expect(screen.getByLabelText("管理员邮箱")).toBeInTheDocument();
  expect(screen.queryByRole("navigation", { name: "后台导航" })).not.toBeInTheDocument();
});
function completeCooperation(dialog: HTMLElement) {
  for (const [label, value] of [
    ["KOL 名称", "Maya"],
    ["平台", "Instagram"],
    ["联系邮箱", "maya@example.com"],
    ["自定义佣金（%）", "10"],
    ["合作开始日", "2026-11-04"],
    ["合作结束日", "2026-11-05"],
  ])
    fireEvent.change(within(dialog).getByLabelText(label), { target: { value } });
}
it("creates using one name, optional social profile and an explicit shopping destination", async () => {
  const fetcher = vi.fn().mockImplementation(async () => Response.json(emptyState));
  vi.stubGlobal("fetch", fetcher);
  render(<AdminConsole view="partners" />);
  fireEvent.click(await screen.findByRole("button", { name: /新增合作/ }));
  const dialog = screen.getByRole("dialog", { name: "新增合作" });
  completeCooperation(dialog);
  expect(within(dialog).queryByLabelText("固定推广别名")).not.toBeInTheDocument();
  expect(within(dialog).getByLabelText("社媒主页（可选）")).not.toBeRequired();
  const target = within(dialog).getByRole("combobox", { name: "链接打开页面" });
  expect(target).toHaveValue("/products");
  fireEvent.change(target, { target: { value: "/" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "保存合作" }));
  await waitFor(() =>
    expect(fetcher).toHaveBeenCalledWith("/api/admin/kol/partners", expect.anything()),
  );
  const payload = JSON.parse(
    fetcher.mock.calls.find(([url]) => url.endsWith("/partners"))![1].body,
  );
  expect(payload).toMatchObject({ name: "Maya", socialUrl: "", target: "/" });
  expect(payload).not.toHaveProperty("alias");
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});
it("shows the server's specific field reason and retains entered values after rejection", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (url: string) =>
      url.endsWith("/partners")
        ? Response.json(
            {
              error: "invalid_input",
              details: [
                { field: "target", message: "请选择有效站内购物页面；达人推广链接由系统生成" },
              ],
            },
            { status: 400 },
          )
        : Response.json(emptyState),
    ),
  );
  render(<AdminConsole view="partners" />);
  fireEvent.click(await screen.findByRole("button", { name: /新增合作/ }));
  const dialog = screen.getByRole("dialog", { name: "新增合作" });
  completeCooperation(dialog);
  fireEvent.click(within(dialog).getByRole("button", { name: "保存合作" }));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent(
    "链接打开页面：请选择有效站内购物页面",
  );
  expect(within(dialog).getByRole("alert")).toHaveFocus();
  expect(within(dialog).getByLabelText("KOL 名称")).toHaveValue("Maya");
  expect(within(dialog).getByRole("button", { name: "保存合作" })).toBeEnabled();
});
describe("management states", () => {
  it.each([
    [
      "shopify_admin_credentials_incomplete",
      "Shopify应用凭据不完整，请同时配置Client ID和Client Secret",
    ],
    [
      "shopify_admin_auth_http_401",
      "Shopify令牌获取失败，请检查应用安装和服务器凭据；系统会稍后重试",
    ],
    ["shopify_admin_auth_network_error", "暂时无法获取Shopify令牌，系统会稍后重试"],
  ])(
    "explains automatic authentication failure %s without showing credentials",
    async (error, label) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(async (url: string) =>
          url.endsWith("connection")
            ? Response.json({ error }, { status: 409 })
            : Response.json({
                ...emptyState,
                health: { ...emptyState.health, shopifyAdminConfigured: true },
              }),
        ),
      );
      render(<AdminConsole view="partners" />);
      fireEvent.click(await screen.findByRole("button", { name: /连接与同步/ }));
      expect(await screen.findByText(label)).toBeInTheDocument();
    },
  );
  it("shows a paused Shopify notice while local management remains usable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) =>
        url.endsWith("connection")
          ? Response.json({ error: "shopify_admin_not_configured" }, { status: 409 })
          : Response.json({
              partners: [],
              codes: [],
              jobs: [],
              orders: [],
              settlements: [],
              balances: [],
              audit: [],
              health: {
                shopifyAdminConfigured: false,
                inbox: [],
                failures: [],
                worker: { at: Date.now(), error: null, shopify: "not_configured" },
              },
              admin: { email: "local@example.com" },
              siteUrl: "https://offy.test",
              settlementsEnabled: false,
            }),
      ),
    );
    render(<AdminConsole view="partners" />);
    expect(await screen.findByText(/未配置 Shopify Admin 连接凭据/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "合作达人" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /连接与同步/ }));
    expect(await screen.findByText("Shopify Admin连接尚未配置")).toBeInTheDocument();
    expect(screen.queryByText(/已连接 · 权限/)).not.toBeInTheDocument();
  });
  it("requires login when the authenticated API returns 401 without displaying demonstration money", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ error: "login_required" }, { status: 401 })),
    );
    render(<AdminConsole view="partners" />);
    expect(await screen.findByLabelText("管理员邮箱")).toBeInTheDocument();
    expect(screen.queryByText("Maya")).not.toBeInTheDocument();
  });
  it("shows a retry state for a failed data read instead of an empty cooperation list", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<AdminConsole view="partners" />);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("连接失败"));
    expect(screen.getByRole("button", { name: "重新连接" })).toBeInTheDocument();
  });
});

it("suggests an editable unique candidate after selecting a KOL for new-code creation", async () => {
  const { fireEvent } = await import("@testing-library/react");
  const partner = {
    id: "kol-maya",
    name: "Maya",
    alias: "maya",
    status: "active",
    rateBps: 725,
    requests: 0,
    landings: 0,
    metrics: [],
    terms: {
      name: "Maya",
      alias: "maya",
      platform: "IG",
      email: "maya@example.com",
      socialUrl: "https://example.com/maya",
      rate: "7.25",
      startsAt: "2020-01-01",
      endsAt: "2099-01-01",
      target: "/products",
      status: "active",
    },
  };
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (url: string) =>
      Response.json(
        url.endsWith("connection")
          ? { scopes: ["write_discounts"], campaigns: { nodes: [], truncated: false } }
          : {
              partners: [partner],
              codes: [],
              jobs: [],
              orders: [],
              settlements: [],
              balances: [],
              audit: [],
              health: { inbox: [], failures: [] },
              admin: { email: "admin@example.com" },
              siteUrl: "https://offy.test",
              settlementsEnabled: false,
            },
      ),
    ),
  );
  render(<AdminConsole view="codes" />);
  fireEvent.click(await screen.findByRole("button", { name: "生成新码并同步" }));
  fireEvent.change(screen.getByLabelText(/合作达人/), { target: { value: "kol-maya" } });
  const input = screen.getByLabelText("唯一候选码") as HTMLInputElement;
  expect(input.value).toMatch(/^MAYA-[A-F0-9]{8}$/);
  fireEvent.change(input, { target: { value: "MAYA-MANUAL" } });
  expect(input.value).toBe("MAYA-MANUAL");
  fireEvent.click(screen.getByLabelText("关闭"));
  expect(screen.getByRole("button", { name: "生成新码并同步" })).toHaveFocus();
});
