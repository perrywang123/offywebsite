// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { signature } from "@/server/kol/core";
import { giftRuleSignature } from "@/server/shopify/gift-rules";
import { POST } from "./route";

const { adminRequest } = vi.hoisted(() => ({ adminRequest: vi.fn(async () => ({ nodes: [] })) }));
vi.mock("@/server/kol/shopify", () => ({ adminRequest }));

const secret = "gift-rules-integration-test-secret";
const initial = env.KOL_WORKER_SECRET;
afterEach(() => {
  env.KOL_WORKER_SECRET = initial;
  adminRequest.mockClear();
});

function request(body: string, proof?: string) {
  return new Request("http://admin:3000/api/internal/shopify/gift-rules", {
    method: "POST",
    body,
    headers: {
      "content-length": String(body.length),
      ...(proof ? { "x-offy-gift-signature": proof } : {}),
    },
  });
}
const payload = JSON.stringify(["gid://shopify/DiscountAutomaticNode/1"]);

describe("gift rules service authentication", () => {
  it("hides the endpoint from unsigned and modified requests", async () => {
    env.KOL_WORKER_SECRET = secret;
    const proof = signature(giftRuleSignature + payload, secret);
    expect((await POST(request(payload))).status).toBe(404);
    expect((await POST(request(payload.replace("/1", "/2"), proof))).status).toBe(404);
    expect((await POST(request(" ".repeat(1025), proof))).status).toBe(404);
    expect(adminRequest).not.toHaveBeenCalled();
  });

  it("reads only the signed automatic discount IDs and never caches the response", async () => {
    env.KOL_WORKER_SECRET = secret;
    const wrongType = JSON.stringify(["gid://shopify/Order/1"]);
    expect(
      (await POST(request(wrongType, signature(giftRuleSignature + wrongType, secret)))).status,
    ).toBe(503);
    expect(adminRequest).not.toHaveBeenCalled();
    const response = await POST(request(payload, signature(giftRuleSignature + payload, secret)));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ rules: [] });
    expect(adminRequest).toHaveBeenCalledTimes(1);
  });
});
