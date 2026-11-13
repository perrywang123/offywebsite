import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { collabsCreatorArchives, collabsCreators } from "../db/schema";
import type { Db } from "../kol/db";
import { audit } from "../kol/core";

export const archiveSchema = z
  .object({
    id: z.string().uuid(),
    reason: z.enum(["test", "ended", "other"]),
    note: z.string().trim().max(500).default(""),
    confirmed: z.literal(true),
  })
  .strict();

export function archivedCreatorIds(db: Db) {
  return new Set(
    db
      .select({ id: collabsCreatorArchives.creatorId })
      .from(collabsCreatorArchives)
      .all()
      .map((c) => c.id),
  );
}

export function listArchivedCreators(db: Db) {
  return db
    .select({ creator: collabsCreators, archive: collabsCreatorArchives })
    .from(collabsCreatorArchives)
    .innerJoin(collabsCreators, eq(collabsCreators.id, collabsCreatorArchives.creatorId))
    .orderBy(desc(collabsCreatorArchives.archivedAt))
    .all()
    .map(({ creator, archive }) => ({
      ...creator,
      archivedAt: archive.archivedAt,
      archivedBy: archive.archivedBy,
      archiveReason: archive.reason,
      archiveNote: archive.note,
    }));
}

export function archiveCreator(db: Db, raw: unknown, actor: string) {
  const input = archiveSchema.parse(raw);
  return db.transaction(
    (tx) => {
      const creator = tx
        .select()
        .from(collabsCreators)
        .where(eq(collabsCreators.id, input.id))
        .get();
      if (!creator) throw new Error("creator_missing");
      const old = tx
        .select()
        .from(collabsCreatorArchives)
        .where(eq(collabsCreatorArchives.creatorId, input.id))
        .get();
      if (old) return old;
      const now = Date.now();
      tx.update(collabsCreators)
        .set({ enabled: false, updatedAt: now })
        .where(eq(collabsCreators.id, input.id))
        .run();
      const archive = {
        creatorId: input.id,
        archivedAt: now,
        archivedBy: actor,
        reason: input.reason,
        note: input.note,
      };
      tx.insert(collabsCreatorArchives).values(archive).run();
      audit(tx, actor, "collabs.creator.archive", input.id, {
        alias: creator.alias,
        reason: input.reason,
        note: input.note,
        wasEnabled: creator.enabled,
      });
      return archive;
    },
    { behavior: "immediate" },
  );
}

export function restoreCreator(db: Db, id: string, actor: string) {
  z.string().uuid().parse(id);
  return db.transaction(
    (tx) => {
      const creator = tx.select().from(collabsCreators).where(eq(collabsCreators.id, id)).get();
      if (!creator) throw new Error("creator_missing");
      const old = tx
        .select()
        .from(collabsCreatorArchives)
        .where(eq(collabsCreatorArchives.creatorId, id))
        .get();
      if (!old) return { ok: true };
      tx.update(collabsCreators)
        .set({ enabled: false, updatedAt: Date.now() })
        .where(eq(collabsCreators.id, id))
        .run();
      tx.delete(collabsCreatorArchives).where(eq(collabsCreatorArchives.creatorId, id)).run();
      audit(tx, actor, "collabs.creator.restore", id, {
        alias: creator.alias,
        previousArchive: old,
      });
      return { ok: true };
    },
    { behavior: "immediate" },
  );
}
