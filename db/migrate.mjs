// Apply Drizzle migrations. Runs with plain `node` (no tsx) so it can be
// shipped inside the standalone bundle / Docker image.
//
// Best-effort .env loading for local dev; harmless when `dotenv` is absent in
// a production bundle (env is then provided by systemd / Docker / the shell).
try {
  await import("dotenv/config");
} catch {
  /* no-op */
}

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const url = process.env.DATABASE_URL ?? "./data/offy.db";
const migrationsFolder = process.env.MIGRATIONS_FOLDER ?? "./db/migrations";

if (url !== ":memory:") {
  mkdirSync(dirname(url), { recursive: true });
}

const sqlite = new Database(url);
const db = drizzle(sqlite);

migrate(db, { migrationsFolder });
console.log("Migrations applied.");
sqlite.close();
