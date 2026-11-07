// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const s = vi.hoisted(() => ({
  enabled: true,
  accept: vi.fn(),
  db: vi.fn(),
  secret: "test-only-signing-secret-1234567890",
}));
vi.mock("@/lib/env", () => ({
  env: {
    get KOL_SIGNING_SECRET() {
      return s.secret;
    },
    SHOPIFY_STORE_DOMAIN: "shop.myshopify.com",
  },
  kolEnabled: () => s.enabled,
}));
vi.mock("@/server/collabs/mode", () => ({ collabsMode: () => true }));
vi.mock("@/server/kol/database", () => ({ getKolDb: s.db }));
vi.mock("@/server/collabs/events", async (original) => ({
  ...(await original<typeof import("@/server/collabs/events")>()),
  acceptAttribution: s.accept,
}));
import { POST } from "./route";
import { flowToken } from "@/server/collabs/flow-auth";
const send = (body: string, token?: string) =>
  POST(
    new Request("https://isoffy.com/api/collabs/attributed", {
      method: "POST",
      headers: token ? { authorization: `Bearer ${token}` } : {},
      body,
    }),
  );
beforeEach(() => {
  vi.clearAllMocks();
  s.enabled = true;
});
it("authenticates before opening the database and scopes the credential to this purpose", async () => {
  expect((await send("{}", s.secret)).status).toBe(404);
  expect((await send("{}")).status).toBe(404);
  expect(s.db).not.toHaveBeenCalled();
  expect(flowToken(s.secret)).not.toBe(s.secret);
});
it("acknowledges only a durable write and reports unavailable storage for Flow retries", async () => {
  s.accept.mockReturnValueOnce(true);
  expect((await send("{}", flowToken(s.secret))).status).toBe(200);
  s.accept.mockImplementationOnce(() => {
    throw new Error("database unavailable");
  });
  const failed = await send("{}", flowToken(s.secret));
  expect(failed.status).toBe(503);
  expect(await failed.text()).not.toContain("database unavailable");
});
it("rejects oversized streamed bodies and malformed JSON", async () => {
  expect((await send("x".repeat(32769), flowToken(s.secret))).status).toBe(413);
  expect((await send("not-json", flowToken(s.secret))).status).toBe(400);
  expect(s.accept).not.toHaveBeenCalled();
});
it("validates Flow's rendered test request without opening or changing the production database", async () => {
  const request = new Request("https://isoffy.com/api/collabs/attributed?validate=1", {
    method: "POST",
    headers: { authorization: `Bearer ${flowToken(s.secret)}` },
    body: JSON.stringify({
      version: 1,
      shop: "shop.myshopify.com",
      sentAt: String(Math.floor(Date.now() / 1000)),
      communityMemberId: 123,
      firstName: null,
      lastName: null,
      primaryUsername: null,
      salesNumber: null,
      linkVisitsCumulative: null,
      salesCumulativeCents: null,
      commissionCumulativeCents: null,
      orderId: "gid://shopify/Order/1",
      orderName: "#TEST-ONLY",
      orderCreatedAt: new Date().toISOString(),
    }),
  });
  expect(await (await POST(request)).json()).toEqual({ ok: true, validationOnly: true });
  expect(s.db).not.toHaveBeenCalled();
  expect(s.accept).not.toHaveBeenCalled();
});
