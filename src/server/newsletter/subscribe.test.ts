// @vitest-environment node
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";
import * as schema from "../db/schema";
import { subscribeEmail } from "./subscribe";

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE newsletter_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    );
  `);
  return drizzle(sqlite, { schema });
}

describe("subscribeEmail", () => {
  it("accepts a valid email and persists it trimmed + lowercased", () => {
    const db = createTestDb();

    expect(subscribeEmail("  A@Example.COM ", db)).toEqual({ ok: true });

    const rows = db.select().from(schema.newsletterSubscribers).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe("a@example.com");
  });

  it("rejects an invalid email without touching the database", () => {
    const db = createTestDb();

    expect(subscribeEmail("not-an-email", db)).toEqual({
      ok: false,
      status: 400,
      reason: "invalid_email",
    });
    expect(db.select().from(schema.newsletterSubscribers).all()).toHaveLength(0);
  });

  it("rejects a duplicate email as already subscribed", () => {
    const db = createTestDb();

    expect(subscribeEmail("a@example.com", db)).toEqual({ ok: true });
    expect(subscribeEmail("a@example.com", db)).toEqual({
      ok: false,
      status: 409,
      reason: "already_subscribed",
    });
  });
});
