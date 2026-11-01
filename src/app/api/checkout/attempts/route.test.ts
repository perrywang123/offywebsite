// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { testDb } from "@/server/kol/test-db";
import { attemptDetail } from "@/server/checkout-diagnostics/store";
const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/server/db/client", () => ({ getDb: () => state.db }));
import { POST } from "./route";
function req(body: unknown, origin?: string) {
  return new Request("http://localhost/api/checkout/attempts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(origin ? { origin } : {}),
      "cf-ipcountry": "GB",
    },
    body: JSON.stringify(body),
  });
}
describe("public anonymous diagnostics", () => {
  beforeEach(() => {
    state.db = testDb();
  });
  it("records without email, accepts bounded observations and exposes no record-reading API", async () => {
    const response = await POST(
      req({
        action: "start",
        items: [{ code: "wild", quantity: 1 }],
        locale: "en",
        pagePath: "/cart",
      }),
    );
    const a = await response.json();
    expect(response.status).toBe(200);
    expect(attemptDetail(state.db as ReturnType<typeof testDb>, a.id)).toMatchObject({
      country: "GB",
      status: "started",
    });
    expect(
      (
        await POST(
          req({ action: "observe", receipt: a.receipt, type: "client_verification_failed" }),
        )
      ).status,
    ).toBe(204);
    expect(attemptDetail(state.db as ReturnType<typeof testDb>, a.id)!.status).toBe(
      "client_failed",
    );
    expect((await POST(req({ action: "observe", receipt: a.receipt, type: "paid" }))).status).toBe(
      400,
    );
    expect((await POST(req({ action: "read", id: a.id }))).status).toBe(400);
  });
  it("rejects cross-origin requests and arbitrary oversized product fields", async () => {
    const input = { action: "start", items: [{ code: "wild", quantity: 1 }], locale: "en" };
    expect((await POST(req(input, "https://unrelated.test"))).status).toBe(403);
    expect(
      (await POST(req({ ...input, items: [{ code: "x".repeat(201), quantity: 1 }] }))).status,
    ).toBe(400);
  });
});
