// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const state = vi.hoisted(() => ({ operation: vi.fn() }));
vi.mock("@/server/collabs/admin", () => ({
  collabsGet: vi.fn(),
  collabsPost: state.operation,
}));
vi.mock("@/server/kol/database", () => ({ getKolDb: () => ({}) }));
vi.mock("@/server/kol/auth", async (original) => ({
  ...(await original<typeof import("@/server/kol/auth")>()),
  requireMutation: vi.fn(),
  requireAdmin: () => ({ id: "test-admin", email: "tester@example.com" }),
}));
import { POST } from "./route";

function request() {
  return POST(
    new Request("https://offy.test/api/admin/kol/collabs/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmed: false }),
    }),
    { params: Promise.resolve({ path: ["collabs", "import"] }) },
  );
}

describe("Collabs asynchronous administrator error boundary", () => {
  beforeEach(() => {
    state.operation.mockReset();
  });

  it("returns structured field validation when an async import rejects", async () => {
    const parsed = z.object({ confirmed: z.literal(true) }).safeParse({ confirmed: false });
    if (parsed.success) throw new Error("Expected invalid confirmation fixture");
    state.operation.mockRejectedValue(parsed.error);
    const response = await request();
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: "invalid_input",
      details: [{ field: "confirmed" }],
    });
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("returns the safe business error instead of an unhandled rejection", async () => {
    state.operation.mockRejectedValue(new Error("currency_required"));
    const response = await request();
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "currency_required" });
  });

  it("does not leak internal details from rejected operations", async () => {
    state.operation.mockRejectedValue(new Error("Upstream response includes private credential"));
    const response = await request();
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "operation_failed" });
  });
});
