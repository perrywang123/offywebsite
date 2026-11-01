// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ secret: "", accept: vi.fn(), db: vi.fn() }));
vi.mock("@/lib/env", () => ({
  env: {
    get SHOPIFY_WEBHOOK_SECRET() {
      return state.secret;
    },
    SHOPIFY_STORE_DOMAIN: "shop.myshopify.com",
  },
  kolEnabled: () => true,
}));
vi.mock("@/server/kol/database", () => ({ getKolDb: state.db }));
vi.mock("@/server/kol/sync", () => ({ acceptWebhook: state.accept }));
import { POST } from "./route";
afterEach(() => {
  state.secret = "";
  vi.clearAllMocks();
});
describe("optional Shopify notification ingestion", () => {
  it("refuses notifications before configuring the signing secret", async () => {
    const response = await POST(
      new Request("https://offy.test/api/kol/webhook", { method: "POST", body: "{}" }),
    );
    expect(response.status).toBe(404);
    expect(state.db).not.toHaveBeenCalled();
    expect(state.accept).not.toHaveBeenCalled();
  });
  it("still rejects failed signature verification when a real secret is configured", async () => {
    state.secret = "synthetic-notification-secret";
    state.accept.mockImplementationOnce(() => {
      throw new Error("invalid_webhook");
    });
    const response = await POST(
      new Request("https://offy.test/api/kol/webhook", { method: "POST", body: "{}" }),
    );
    expect(state.accept).toHaveBeenCalled();
    expect(response.status).toBe(401);
  });
});
