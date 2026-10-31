// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { testDb } from "./test-db";
import { kolAdmins } from "../db/schema";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});
const owner = "wangperry666@gmail.com",
  password = "samplepass12";
async function auth(mode: "test" | "production") {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", mode);
  return import("./auth");
}
describe("production owner allowlist", () => {
  it("accepts the normalized owner and 12-character password, blocks other account creation", async () => {
    const db = testDb(),
      a = await auth("production");
    await a.addAdmin(db, " WANGPERRY666@gmail.com ", password);
    expect((await a.authenticate(db, owner, password))?.admin.email).toBe(owner);
    await expect(a.addAdmin(db, "other@example.com", "long-test-password")).rejects.toThrow(
      "admin_email_not_allowed",
    );
    await expect(a.hashPassword("shortpass11")).rejects.toThrow();
  });
  it("rejects other stored users and old sessions in production while leaving test login available", async () => {
    const db = testDb(),
      dev = await auth("test");
    await dev.addAdmin(db, "tester@example.com", "long-test-password");
    const session = (await dev.authenticate(db, "tester@example.com", "long-test-password"))!;
    expect(dev.sessionAdmin(db, session.token)).not.toBeNull();
    const prod = await auth("production");
    expect(await prod.authenticate(db, "tester@example.com", "long-test-password")).toBeNull();
    expect(prod.sessionAdmin(db, session.token)).toBeNull();
  });
  it("does not accept gmail aliases or lookalike email addresses", async () => {
    const db = testDb(),
      a = await auth("production"),
      hash = await a.hashPassword("long-test-password");
    for (const email of ["wangperry666+admin@gmail.com", "wangperry666@gmail.com.attacker.test"]) {
      db.insert(kolAdmins)
        .values({ id: randomUUID(), email, passwordHash: hash, createdAt: Date.now() })
        .run();
      expect(await a.authenticate(db, email, "long-test-password")).toBeNull();
    }
  });
});
