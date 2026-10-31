import type { Db as Database } from "../db/client";
/** Transaction-compatible DAL; no direct native connection access. */
export type Db = Pick<Database, "select" | "insert" | "update" | "delete" | "transaction">;
