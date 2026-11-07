// @vitest-environment node
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { expect, it } from "vitest";
import * as schema from "../db/schema";
import { saveCreator, importReport, reportDetail } from "./service";

it("preserves bound evidence and previous storefront readers across the identity migration", () => {
  const baseline = mkdtempSync(join(tmpdir(), "offy-collabs-baseline-"));
  const sqlite = new Database(":memory:");
  try {
    const journal = JSON.parse(readFileSync("db/migrations/meta/_journal.json", "utf8"));
    const entries = journal.entries.filter((e: { idx: number }) => e.idx <= 8);
    mkdirSync(join(baseline, "meta"));
    writeFileSync(join(baseline, "meta/_journal.json"), JSON.stringify({ ...journal, entries }));
    for (const e of entries)
      copyFileSync(`db/migrations/${e.tag}.sql`, join(baseline, `${e.tag}.sql`));
    const db = drizzle(sqlite, { schema });
    sqlite.pragma("foreign_keys = ON");
    migrate(db, { migrationsFolder: baseline });
    const existing = saveCreator(
      db,
      {
        name: "Existing creator",
        alias: "existing",
        creatorKey: "report-original",
        officialLink: "https://isoffy.com/products?dt_id=existing-test",
        enabled: true,
      },
      "owner",
      "https://isoffy.com",
    );
    const report = importReport(
      db,
      {
        filename: "migration-test.csv",
        csv: "Creator,Currency,Commission\nreport-original,USD,4.59",
        kind: "sales",
        granularity: "creator",
        periodFrom: "2026-11-01",
        periodTo: "2026-11-30",
        numberFormat: "dot",
        salesBasis: "unspecified",
        mapping: { creator: "Creator", currency: "Currency", commission: "Commission" },
      },
      "owner",
      { key: Buffer.alloc(32, 7), confirmed: true },
    );
    // The deployed storefront retains this previous non-null schema definition.
    const legacyCreators = sqliteTable("collabs_creators", {
      id: text("id").primaryKey(),
      alias: text("alias").notNull(),
      name: text("name").notNull(),
      creatorKey: text("creator_key").notNull(),
      officialLink: text("official_link").notNull(),
      enabled: integer("enabled", { mode: "boolean" }).notNull(),
      createdAt: integer("created_at").notNull(),
      updatedAt: integer("updated_at").notNull(),
    });
    const legacyRead = drizzle(sqlite).select().from(legacyCreators).prepare();
    expect(legacyRead.all()).toEqual([existing]);
    migrate(db, { migrationsFolder: "db/migrations" });
    const pending = saveCreator(
      db,
      {
        name: "New creator",
        alias: "new-creator",
        officialLink: "https://isoffy.com/products?dt_id=pending-test",
        enabled: true,
      },
      "owner",
      "https://isoffy.com",
    );
    expect(legacyRead.all()).toEqual(expect.arrayContaining([existing, pending]));
    expect(pending.creatorKey).toBeNull();
    expect(reportDetail(db, report.id).rows[0]).toMatchObject({
      creator: "report-original",
      commission: 459,
    });
    expect(() =>
      saveCreator(
        db,
        {
          ...pending,
          id: undefined,
          alias: "existing",
          officialLink: "https://isoffy.com/products?dt_id=separate-test",
        },
        "owner",
        "https://isoffy.com",
      ),
    ).toThrow(/UNIQUE/);
    expect(() =>
      saveCreator(db, { ...pending, creatorKey: "report-original" }, "owner", "https://isoffy.com"),
    ).toThrow(/UNIQUE/);
    expect(sqlite.pragma("integrity_check", { simple: true })).toBe("ok");
    expect(sqlite.pragma("foreign_keys", { simple: true })).toBe(1);
    expect(sqlite.pragma("foreign_key_check")).toEqual([]);
  } finally {
    sqlite.close();
    rmSync(baseline, { recursive: true, force: true });
  }
});
