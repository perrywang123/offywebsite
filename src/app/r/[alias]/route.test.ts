// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const s = vi.hoisted(() => ({
  callbacks: [] as (() => void)[],
  record: vi.fn(),
  enabled: true,
  found: true,
}));
vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  after: (fn: () => void) => s.callbacks.push(fn),
}));
vi.mock("@/lib/env", () => ({
  env: { SITE_URL: "https://isoffy.com" },
  kolEnabled: () => s.enabled,
}));
vi.mock("@/server/collabs/mode", () => ({ collabsMode: () => true }));
vi.mock("@/server/kol/database", () => ({ getKolDb: () => ({}) }));
vi.mock("@/server/collabs/link-db", () => ({ getLinkObservationDb: () => ({}) }));
vi.mock("@/server/collabs/service", () => ({
  listCreators: () =>
    s.found
      ? [
          {
            id: "creator",
            alias: "perry",
            enabled: true,
            officialLink: "https://isoffy.com/products?dt_id=official",
          },
        ]
      : [],
}));
vi.mock("@/server/collabs/links", () => ({ recordLinkOpen: s.record }));
import { GET, HEAD } from "./route";
const context = { params: Promise.resolve({ alias: "perry" }) };
beforeEach(() => {
  s.callbacks = [];
  s.enabled = true;
  s.found = true;
  s.record.mockReset();
});
it("preserves the redirect and official tracking id, then records best-effort after the response", async () => {
  const r = await GET(
    new Request("https://isoffy.com/r/perry?dt_id=wrong&utm_source=instagram"),
    context,
  );
  expect(r.status).toBe(303);
  expect(r.headers.get("location")).toBe(
    "https://isoffy.com/products?dt_id=official&utm_source=instagram",
  );
  expect(r.headers.get("set-cookie")).toBeNull();
  expect(s.record).not.toHaveBeenCalled();
  expect(s.callbacks).toHaveLength(1);
  s.record.mockImplementation(() => {
    throw new Error("database unavailable");
  });
  expect(() => s.callbacks[0]()).not.toThrow();
  expect(s.record).toHaveBeenCalledWith({}, "creator", expect.any(Number));
});
it.each<Record<string, string>>([
  { purpose: "prefetch" },
  { "sec-purpose": "prefetch;prerender" },
  { "user-agent": "WhatsApp" },
  { "next-router-prefetch": "1" },
])("excludes prefetch and preview requests %j", async (headers) => {
  expect((await GET(new Request("https://isoffy.com/r/perry", { headers }), context)).status).toBe(
    204,
  );
  expect(s.callbacks).toHaveLength(0);
});
it("excludes HEAD and unavailable links", async () => {
  expect((await HEAD()).status).toBe(204);
  s.found = false;
  expect((await GET(new Request("https://isoffy.com/r/perry"), context)).status).toBe(410);
  expect(s.callbacks).toHaveLength(0);
});
