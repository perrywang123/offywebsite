// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/payments/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validItems = [{ code: "swan-princess", quantity: 1 }];

describe("POST /api/payments/checkout", () => {
  it("routes provider=stripe to the Stripe provider (passes zod, reaches provider)", async () => {
    const res = await POST(req({ provider: "stripe", items: validItems, locale: "zh" }));
    // Stripe 未配置时返回 503 checkout_unavailable —— 证明已通过 zod 到达 provider 层,
    // 而不是 400 invalid_request(修复前前端发 "card" 必现 400)。
    expect(res.status).not.toBe(400);
    const data = await res.json();
    expect(data.error).not.toBe("invalid_request");
  });

  it("routes provider=shopify to the Shopify provider", async () => {
    const res = await POST(req({ provider: "shopify", items: validItems, locale: "zh" }));
    expect(res.status).not.toBe(400);
  });

  it("rejects invalid body (empty items)", async () => {
    const res = await POST(req({ provider: "stripe", items: [], locale: "zh" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("invalid_request");
  });

  it("rejects unknown provider enum value", async () => {
    const res = await POST(req({ provider: "card", items: validItems, locale: "zh" }));
    expect(res.status).toBe(400);
  });
});
