import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import sharp from "sharp";
import {
  homeImageByteLimit,
  homeImageMaxEdge,
  homeMediaId,
  homeMediaPrefix,
} from "@/lib/home-content";
import { homepageImages } from "@/server/db/schema";
import { AccessError } from "@/server/kol/auth";
import type { Db } from "@/server/kol/db";

async function readImage(request: Request) {
  if (Number(request.headers.get("content-length")) > homeImageByteLimit)
    throw new AccessError("homepage_image_too_large", 413);
  if (!request.body) throw new AccessError("homepage_image_invalid", 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > homeImageByteLimit) {
        await reader.cancel();
        throw new AccessError("homepage_image_too_large", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, size);
}

export async function storeHomeImage(db: Db, request: Request) {
  const input = await readImage(request);
  let bytes: Buffer;
  try {
    const image = sharp(input, { limitInputPixels: 4096 * 4096, failOn: "warning" });
    const { format, pages } = await image.metadata();
    if (!format || !["jpeg", "png", "webp", "heif"].includes(format) || (pages ?? 1) > 1)
      throw new Error("unsupported_image");
    bytes = await image
      .rotate()
      .resize(homeImageMaxEdge, homeImageMaxEdge, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86 })
      .toBuffer();
  } catch {
    throw new AccessError("homepage_image_invalid", 400);
  }
  const id = createHash("sha256").update(bytes).digest("hex");
  db.insert(homepageImages).values({ id, bytes }).onConflictDoNothing().run();
  return { image: `${homeMediaPrefix}${id}` };
}

export function homeImageResponse(db: Db, id: string, editorPreview = false) {
  const row =
    homeMediaId.test(id) &&
    db
      .select({ bytes: homepageImages.bytes })
      .from(homepageImages)
      .where(
        and(
          eq(homepageImages.id, id),
          editorPreview ? undefined : eq(homepageImages.published, true),
        ),
      )
      .get();
  if (!row) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(new Uint8Array(row.bytes), {
    headers: {
      "Content-Type": "image/webp",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": editorPreview ? "no-store, private" : "public, max-age=31536000, immutable",
    },
  });
}
