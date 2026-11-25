import { cache } from "react";
import { eq, inArray } from "drizzle-orm";
import { defaultHomeContent, homeContentVersionSchema, homeMediaPrefix } from "@/lib/home-content";
import { getDb } from "@/server/db/client";
import { homepageContent, homepageImages } from "@/server/db/schema";
import { AccessError } from "@/server/kol/auth";
import { audit } from "@/server/kol/core";
import type { Db } from "@/server/kol/db";

const homeId = 1;

export function loadHomeContent(db: Db) {
  const row = db
    .select({ content: homepageContent.content, revision: homepageContent.revision })
    .from(homepageContent)
    .where(eq(homepageContent.id, homeId))
    .get();
  return row ? homeContentVersionSchema.parse(row) : { revision: 0, content: defaultHomeContent() };
}

export const getPublishedHomeContent = cache(() => {
  try {
    return loadHomeContent(getDb()).content;
  } catch (error) {
    // A fresh local database can render the brand site before migrations are applied.
    if (!(error instanceof Error && error.message.includes("no such table: homepage_content"))) {
      console.warn("[homepage] Could not read published content");
    }
    return defaultHomeContent();
  }
});

export function publishHomeContent(db: Db, input: unknown, adminId: string) {
  const edit = homeContentVersionSchema.parse(input);
  const { hero, latest } = edit.content;
  const ids = [
    ...new Set(
      [...hero, latest.feature, ...latest.items]
        .map((item) => item.image)
        .filter((image) => image.startsWith(homeMediaPrefix))
        .map((image) => image.slice(homeMediaPrefix.length)),
    ),
  ];
  return db.transaction(
    (tx) => {
      const current = loadHomeContent(tx);
      if (current.revision !== edit.revision) throw new AccessError("homepage_changed", 409);
      if (ids.length) {
        const updated = tx
          .update(homepageImages)
          .set({ published: true })
          .where(inArray(homepageImages.id, ids))
          .run();
        if (updated.changes !== ids.length) throw new AccessError("homepage_image_missing", 400);
      }
      const published = { content: edit.content, revision: edit.revision + 1 };
      tx.insert(homepageContent)
        .values({ id: homeId, ...published })
        .onConflictDoUpdate({ target: homepageContent.id, set: published })
        .run();
      audit(tx, adminId, "homepage.publish", String(homeId), { revision: published.revision });
      return published;
    },
    { behavior: "immediate" },
  );
}
