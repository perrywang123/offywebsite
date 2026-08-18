import "dotenv/config";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const url = process.env.DATABASE_URL ?? "./data/offy.db";

if (url !== ":memory:") {
  mkdirSync(dirname(url), { recursive: true });
}

const sqlite = new Database(url);
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: "./db/migrations" });
console.log("Migrations applied.");
sqlite.close();
