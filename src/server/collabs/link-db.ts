import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { env } from "@/lib/env";
import * as schema from "../db/schema";
import type { Db } from "../kol/db";
let cached: Db | undefined;
/** Separate bounded writer: observation must not wait on financial/admin locks for five seconds. */
export function getLinkObservationDb(): Db {
  if (!cached) {
    if (env.DATABASE_PROVIDER !== "sqlite") throw new Error("unsupported_observation_database");
    const sqlite = new Database(env.DATABASE_URL, { fileMustExist: true, timeout: 50 });
    sqlite.pragma("foreign_keys = ON");
    cached = drizzle(sqlite, { schema });
  }
  return cached;
}
