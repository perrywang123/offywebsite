import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AdminConsole } from "./AdminConsole";
describe("management states", () => {
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
