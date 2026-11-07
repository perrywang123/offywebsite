// @vitest-environment node
import { afterEach, expect, it } from "vitest";
import { env } from "@/lib/env";
import { testDb } from "../kol/test-db";
import { startReferral, createIntent, createPartner, cooperationSchema } from "../kol/core";
import { createSettlement, applyOrder } from "../kol/ledger";
afterEach(() => {
  env.KOL_ACCOUNTING_MODE = "offy";
});
it("prevents legacy attribution and payable writes in Collabs mode", () => {
  env.KOL_ACCOUNTING_MODE = "collabs";
  const db = testDb();
  expect(() => startReferral(db, "maya")).toThrow("collabs_managed");
  expect(() => createIntent(db, "invalid", "secret")).toThrow("collabs_managed");
  expect(() => createSettlement(db, "maya", "USD", "2026-11", "owner")).toThrow("collabs_managed");
  expect(() => applyOrder(db, {}, "secret")).toThrow("collabs_managed");
  expect(() =>
    createPartner(db, {} as ReturnType<typeof cooperationSchema.parse>, "owner"),
  ).toThrow("collabs_managed");
});
