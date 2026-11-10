// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { testDb } from "@/server/kol/test-db";
import { listAttempts, attemptDetail } from "@/server/checkout-diagnostics/store";
const state = vi.hoisted(() => ({ db: null as unknown, createCheckout: vi.fn() }));
vi.mock("@/server/db/client", () => ({ getDb: () => state.db }));
vi.mock("@/server/payments/registry", () => ({
  resolveProvider: () => ({ name: "shopify", createCheckout: state.createCheckout }),
}));
import { POST } from "./route";
describe("checkout API diagnostic boundary", () => {
  beforeEach(() => {
    state.db = testDb();
    state.createCheckout.mockReset();
  });
  function request(expectedCountry?: string) {
    return new Request("http://localhost/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-country-code": "GB" },
      body: JSON.stringify({
        provider: "shopify",
        expectedCountry,
        items: [{ code: "wild", quantity: 2 }],
        locale: "en",
        email: "private@example.com",
      }),
    });
  }
  it("records anonymous requests and Shopify failures without storing optional contact details", async () => {
    state.createCheckout.mockImplementation(async (input) => {
      input.diagnostics({ type: "catalog_checked", data: { failures: [{ code: "wild" }] } });
      return { ok: false, status: 502, error: "shopify_error" };
    });
    const response = await POST(request()),
      body = await response.json();
    expect(response.status).toBe(502);
    const detail = attemptDetail(state.db as ReturnType<typeof testDb>, body.attemptId)!;
    expect(detail).toMatchObject({
      country: "GB",
      status: "failed",
      items: [{ code: "wild", quantity: 2 }],
    });
    expect(JSON.stringify(detail)).not.toContain("private@example.com");
  });
  it("persists unexpected exceptions as server failure evidence", async () => {
    state.createCheckout.mockRejectedValue(new Error("sensitive exception"));
    expect((await POST(request())).status).toBe(502);
    expect(listAttempts(state.db as ReturnType<typeof testDb>, {}).rows[0]).toMatchObject({
      status: "failed",
      error: "unexpected_checkout_error",
    });
  });
});

it("rejects stale destination before creating a Shopify cart and records the conflict", async () => {
  state.db = testDb();
  state.createCheckout.mockReset();
  const response = await POST(
    new Request("http://localhost/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-country-code": "GB" },
      body: JSON.stringify({
        provider: "shopify",
        items: [{ code: "wild", quantity: 2 }],
        locale: "en",
        expectedCountry: "US",
      }),
    }),
  );
  expect(response.status).toBe(409);
  expect(state.createCheckout).not.toHaveBeenCalled();
  expect(listAttempts(state.db as ReturnType<typeof testDb>, {}).rows[0]).toMatchObject({
    error: "destination_changed",
    country: "GB",
  });
});

it("requires review before checkout when an automatic preference expires into a different country", async () => {
  state.db = testDb();
  state.createCheckout.mockReset();
  const cookie = `offy.market.v1=${encodeURIComponent(JSON.stringify({ country: "GB", source: "ip", resolvedAt: Date.now() - 1_800_000 }))}`;
  const response = await POST(
    new Request("http://localhost/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-country-code": "US", cookie },
      body: JSON.stringify({
        provider: "shopify",
        items: [{ code: "wild", quantity: 2 }],
        locale: "en",
        expectedCountry: "GB",
      }),
    }),
  );
  expect(response.status).toBe(409);
  expect(state.createCheckout).not.toHaveBeenCalled();
});
