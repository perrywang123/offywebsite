// @vitest-environment node
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { testDb } from "./test-db";
import { acceptWebhook, drainInbox } from "./sync";
import { kolInbox } from "../db/schema";
const secret = "webhook-test",
  shop = "offy-test.myshopify.com";
function signed(body: string) {
  return new Headers({
    "x-shopify-hmac-sha256": createHmac("sha256", secret).update(body).digest("base64"),
    "x-shopify-shop-domain": shop,
    "x-shopify-topic": "orders/paid",
    "x-shopify-webhook-id": "event-test-1",
  });
}
describe("durable Shopify inbox", () => {
  it("verifies exact raw bytes, shop and topic, saves minimal PII-free deduplicated work", () => {
    const db = testDb(),
      body = JSON.stringify({
        id: 123,
        admin_graphql_api_id: "gid://shopify/Order/123",
        email: "private@example.com",
        shipping_address: { address1: "private" },
      });
    const h = signed(body);
    expect(acceptWebhook(db, body, h, secret, shop)).toBe(true);
    expect(acceptWebhook(db, body, h, secret, shop)).toBe(false);
    expect(db.select().from(kolInbox).all()).toHaveLength(1);
    expect(JSON.stringify(db.select().from(kolInbox).all())).not.toContain("private");
    expect(() => acceptWebhook(db, body + " ", h, secret, shop)).toThrow("invalid_webhook");
    h.set("x-shopify-shop-domain", "evil.myshopify.com");
    expect(() => acceptWebhook(db, body, h, secret, shop)).toThrow();
  });
  it("retries failures durably instead of acknowledging lost in-memory work", async () => {
    const db = testDb(),
      body = JSON.stringify({ id: 123 });
    acceptWebhook(db, body, signed(body), secret, shop, 100);
    await drainInbox(
      db,
      async () => {
        throw new Error("provider_unavailable");
      },
      100,
    );
    expect(db.select().from(kolInbox).get()?.status).toBe("retry");
    let calls = 0;
    await drainInbox(
      db,
      async () => {
        calls++;
      },
      200,
    );
    expect(calls).toBe(0);
    await drainInbox(
      db,
      async () => {
        calls++;
      },
      100000,
    );
    expect(calls).toBe(1);
    expect(db.select().from(kolInbox).get()?.status).toBe("done");
  });
});
