import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { env } from "../../lib/env";
import * as schema from "./schema";

/**
 * Data-access layer. Local development uses SQLite (zero-dependency).
 *
 * To move to PostgreSQL in production, implement the `postgres` branch here
 * using `drizzle-orm/postgres-js` + the `postgres` package — the schema in
 * `./schema.ts` stays the same. See `docs/architecture.md`.
 */
function createDb() {
  if (env.DATABASE_PROVIDER !== "sqlite") {
    throw new Error(
      `DATABASE_PROVIDER="${env.DATABASE_PROVIDER}" is not wired up yet. ` +
        `Use "sqlite" for local development (see docs/architecture.md).`,
    );
  }

  if (env.DATABASE_URL !== ":memory:") {
    mkdirSync(dirname(env.DATABASE_URL), { recursive: true });
  }

  const sqlite = new Database(env.DATABASE_URL);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  return drizzle(sqlite, { schema });
}

export type Db = ReturnType<typeof createDb>;

let cached: Db | undefined;

export function getDb(): Db {
  return (cached ??= createDb());
}
