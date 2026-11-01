// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { testDb } from "../kol/test-db";
import { listAttempts, attemptDetail } from "./store";
const state = vi.hoisted(() => ({ db: null as unknown, fail: false }));
vi.mock("../db/client", () => ({
  getDb: () => {
    if (state.fail) throw new Error("private database credentials");
    return state.db;
  },
}));
import { startCheckoutRecording } from "./runtime";
describe("diagnostics are independent of KOL and never block commerce", () => {
  beforeEach(() => {
    state.db = testDb();
    state.fail = false;
  });
  it("stores a direct anonymous checkout with country evidence and the final result", () => {
    const recording = startCheckoutRecording(
      new Headers({ "cf-ipcountry": "HK" }),
      [{ code: "test", quantity: 1 }],
      "en",
    )!;
    recording.observe({ type: "catalog_checked", data: { resolved: [] } });
    recording.finish({ ok: false, status: 503, error: "catalog_unavailable" });
    expect(attemptDetail(state.db as ReturnType<typeof testDb>, recording.id)).toMatchObject({
      status: "failed",
      country: "HK",
      error: "catalog_unavailable",
    });
    expect(listAttempts(state.db as ReturnType<typeof testDb>, {}).total).toBe(1);
  });
  it("degrades to a fixed safe log if the database is inaccessible", () => {
    state.fail = true;
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(
      startCheckoutRecording(new Headers(), [{ code: "test", quantity: 1 }], "en"),
    ).toBeUndefined();
    expect(JSON.stringify(log.mock.calls)).not.toContain("credentials");
    log.mockRestore();
  });
});
