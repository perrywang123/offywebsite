// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { testDb } from "@/server/kol/test-db";
import { saveCreator } from "@/server/collabs/service";
import { landingMetrics } from "@/server/collabs/landing";
const state = vi.hoisted(() => ({
  db: null as unknown,
  enabled: true,
  fail: false,
  admit: true,
  opens: 0,
}));
vi.mock("@/lib/env", () => ({
  env: {
    SITE_URL: "https://isoffy.com",
    KOL_SIGNING_SECRET: "isolated-test-signing-secret-000000000",
  },
  kolEnabled: () => state.enabled,
}));
vi.mock("@/server/collabs/mode", () => ({ collabsMode: () => true }));
vi.mock("@/server/collabs/link-db", () => ({
  getLinkObservationDb: () => {
    state.opens++;
    if (state.fail) throw new Error("Private database location");
    return state.db;
  },
}));
vi.mock("@/server/collabs/landing-auth", async (original) => ({
  ...(await original<typeof import("@/server/collabs/landing-auth")>()),
  createLandingLimiter: () => () => state.admit,
}));
import { POST, DELETE } from "./route";
const event = () => ({
  version: 1,
  dtId: "3689395",
  eventId: randomUUID(),
  path: "/products",
  analyticsAllowed: true,
});
function request(body: unknown, headers: Record<string, string> = {}, query = "") {
  return new Request("https://isoffy.com/api/collabs/landing" + query, {
    method: "POST",
    headers: { origin: "https://isoffy.com", "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  state.enabled = true;
  state.fail = false;
  state.admit = true;
  state.opens = 0;
  const db = testDb();
  state.db = db;
  saveCreator(
    db,
    {
      name: "Perry",
      alias: "perry",
      officialLink: "https://isoffy.com/products?dt_id=3689395",
      enabled: true,
    },
    "owner",
    "https://isoffy.com",
  );
});
it("collects accepted views with a signed first-party browser cookie and no browser identifier in JSON", async () => {
  const first = await POST(request(event()));
  expect(first.status).toBe(200);
  const cookie = first.headers.get("set-cookie")!;
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("Secure");
  expect(cookie).toContain("SameSite=lax");
  expect(cookie).toContain("Max-Age=7776000");
  expect(await first.json()).toEqual({ ok: true, duplicate: false });
  const second = await POST(request(event(), { cookie: cookie.split(";")[0] }));
  expect(second.headers.get("set-cookie")).toBeNull();
  expect(landingMetrics(state.db as ReturnType<typeof testDb>).groups[0]).toMatchObject({
    periodPv: 2,
    periodUv: 1,
  });
});
it("validates without opening storage or setting an identifier", async () => {
  state.fail = true;
  const response = await POST(request(event(), {}, "?validate=1"));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true, validationOnly: true });
  expect(response.headers.get("set-cookie")).toBeNull();
  expect(state.opens).toBe(0);
});
it("does not issue identifiers for unknown, unconsented or rejected observations", async () => {
  expect(
    (await POST(request({ ...event(), dtId: "unknown" }))).headers.get("set-cookie"),
  ).toBeNull();
  for (const body of [
    { ...event(), analyticsAllowed: false },
    { ...event(), email: "private@example.test" },
    { ...event(), path: "/products?email=private" },
  ]) {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(response.headers.get("set-cookie")).toBeNull();
  }
});
it("rejects foreign origins, excess rate and oversized streams before storing observations", async () => {
  expect((await POST(request(event(), { origin: "https://elsewhere.test" }))).status).toBe(403);
  state.admit = false;
  expect((await POST(request(event()))).status).toBe(429);
  state.admit = true;
  const response = await POST(request({ ...event(), path: "x".repeat(3000) }));
  expect(response.status).toBe(413);
  expect(state.opens).toBe(0);
});
it.each<Record<string, string>>([
  { "user-agent": "facebookexternalhit" },
  { "sec-purpose": "prefetch" },
  { "sec-gpc": "1" },
])("excludes previews and opt-out headers %j", async (headers) => {
  const response = await POST(request(event(), headers));
  expect(response.status).toBe(204);
  expect(state.opens).toBe(0);
});
it("clears an opted-out browser and removes its membership without removing PV", async () => {
  const response = await POST(request(event())),
    cookie = response.headers.get("set-cookie")!.split(";")[0];
  const forgotten = await DELETE(
    new Request("https://isoffy.com/api/collabs/landing", {
      method: "DELETE",
      headers: { origin: "https://isoffy.com", cookie },
    }),
  );
  expect(forgotten.status).toBe(204);
  expect(forgotten.headers.get("set-cookie")).toContain("Max-Age=0");
  expect(landingMetrics(state.db as ReturnType<typeof testDb>).groups[0]).toMatchObject({
    periodPv: 1,
    periodUv: 0,
  });
});
it("contains storage failures and clears opt-out cookies even when cleanup fails", async () => {
  const first = await POST(request(event())),
    cookie = first.headers.get("set-cookie")!.split(";")[0];
  state.fail = true;
  const failed = await POST(request(event()));
  expect(failed.status).toBe(503);
  expect(await failed.text()).not.toContain("Private");
  const forgotten = await DELETE(
    new Request("https://isoffy.com/api/collabs/landing", {
      method: "DELETE",
      headers: { origin: "https://isoffy.com", cookie },
    }),
  );
  expect(forgotten.status).toBe(503);
  expect(forgotten.headers.get("set-cookie")).toContain("Max-Age=0");
});
