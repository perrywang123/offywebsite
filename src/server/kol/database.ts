import { eq } from "drizzle-orm";
import { env } from "@/lib/env";
import { getDb } from "../db/client";
import { kolRuntime } from "../db/schema";
import type { Db } from "./db";
/** A deployment serves one Shopify shop. Never silently reuse its financial DB for another. */
export function assertShop(db: Db, domain: string) {
  const shop = domain.trim().toLowerCase();
  if (!shop) throw new Error("shopify_shop_missing");
  db.transaction((tx) => {
    const old = tx.select().from(kolRuntime).where(eq(kolRuntime.key, "accountingShop")).get();
    if (old && JSON.parse(old.value) !== shop) throw new Error("accounting_shop_changed");
    if (!old)
      tx.insert(kolRuntime)
        .values({ key: "accountingShop", value: JSON.stringify(shop), updatedAt: Date.now() })
        .run();
  });
}
export function getKolDb() {
  const db = getDb();
  assertShop(db, env.SHOPIFY_STORE_DOMAIN ?? "");
  return db;
}
