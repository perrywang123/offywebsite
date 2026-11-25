import { cache } from "react";
import { eq, inArray } from "drizzle-orm";
import { env } from "@/lib/env";
import {
  defaultHomeContent,
  homeContentVersionSchema,
  homeLaunchHandle,
  homeMediaPrefix,
  type HomeContent,
} from "@/lib/home-content";
import { getDb } from "@/server/db/client";
import { homepageContent, homepageImages } from "@/server/db/schema";
import { AccessError } from "@/server/kol/auth";
import { audit } from "@/server/kol/core";
import type { Db } from "@/server/kol/db";
import { fetchProductData } from "@/server/shopify/products";

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

function requestedLaunches(content: HomeContent) {
  const handles = new Set<string>();
  for (const card of [content.latest.feature, ...content.latest.items]) {
    if (!card.comingSoon) continue;
    const handle = homeLaunchHandle(card.href, env.SITE_URL);
    if (!handle) throw new AccessError("homepage_launch_link_invalid", 400);
    handles.add(handle);
  }
  return handles;
}

export async function publishHomeContent(
  db: Db,
  input: unknown,
  adminId: string,
  readProduct: (handle: string) => Promise<{ releaseAt?: string | null } | null> = fetchProductData,
) {
  const edit = homeContentVersionSchema.parse(input);
  const current = loadHomeContent(db);
  if (current.revision !== edit.revision) throw new AccessError("homepage_changed", 409);
  const previous = requestedLaunches(current.content);
  const launches = [...requestedLaunches(edit.content)].filter((handle) => !previous.has(handle));
  await Promise.all(
    launches.map(async (handle) => {
      let product;
      try {
        product = await readProduct(handle);
      } catch {
        throw new AccessError("homepage_launch_unavailable", 503);
      }
      if (!product) throw new AccessError("homepage_launch_product_missing", 400);
      if (product.releaseAt === undefined)
        throw new AccessError("homepage_launch_not_configured", 400);
    }),
  );
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
