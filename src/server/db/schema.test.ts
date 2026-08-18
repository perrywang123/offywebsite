// @vitest-environment node
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";
import { newsletterSubscribers } from "./schema";

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE newsletter_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    );
  `);
  return drizzle(sqlite, { schema: { newsletterSubscribers } });
}

describe("newsletter_subscribers schema", () => {
  it("auto-fills created_at as a Date", () => {
    const db = createTestDb();

    db.insert(newsletterSubscribers).values({ email: "a@example.com" }).run();

    const rows = db.select().from(newsletterSubscribers).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(1);
    expect(rows[0].createdAt).toBeInstanceOf(Date);
  });

  it("enforces unique email", () => {
    const db = createTestDb();

    db.insert(newsletterSubscribers).values({ email: "a@example.com" }).run();

    expect(() =>
      db.insert(newsletterSubscribers).values({ email: "a@example.com" }).run(),
    ).toThrow();
  });
});
