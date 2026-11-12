// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/server/collabs/link-db", () => ({ getLinkObservationDb: () => state.db }));
vi.mock("./config", () => ({ metaConfig: () => ({ enabled: true, capi: true }) }));
vi.mock("@/lib/env", () => ({
  env: {
    SITE_URL: "https://isoffy.com",
    NODE_ENV: "test",
    CHECKOUT_DIAGNOSTICS_KEY: "a".repeat(64),
  },
}));
import { testDb } from "../kol/test-db";
import { metaEvents } from "../db/schema";
import { recordCheckoutReady } from "./checkout";
describe("server checkout observation", () => {
  it("links a permitted source locally without a CAPI job or browser delivery", () => {
    state.db = testDb();
    const attempt = randomUUID();
    recordCheckoutReady(
      attempt,
      {
        visitorId: randomUUID(),
        source: { ad_id: "123456" },
        pagePath: "/products/a",
        data: { currency: "USD", value: 45.9 },
      },
      new Headers({ origin: "https://isoffy.com" }),
    );
    expect((state.db as ReturnType<typeof testDb>).select().from(metaEvents).get()).toMatchObject({
      name: "CheckoutReady",
      attemptId: attempt,
      status: "observed",
      payload: null,
      pixelAttempted: false,
    });
  });
  it("ignores malformed/GPC context and storage failures without breaking the caller", () => {
    state.db = testDb();
    expect(() =>
      recordCheckoutReady(randomUUID(), { email: "private@example.com" }, new Headers()),
    ).not.toThrow();
    expect((state.db as ReturnType<typeof testDb>).select().from(metaEvents).all()).toHaveLength(0);
    state.db = null;
    expect(() =>
      recordCheckoutReady(
        randomUUID(),
        { visitorId: randomUUID(), source: {}, data: {}, pagePath: "/" },
        new Headers(),
      ),
    ).not.toThrow();
  });
});
