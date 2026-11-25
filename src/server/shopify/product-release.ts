import { z } from "zod";

export const releaseFields = `
  comingSoon: metafield(namespace: "custom", key: "coming_soon") { type value }
  releaseDate: metafield(namespace: "custom", key: "release_date") { type value }
`;

const metafield = z.object({ type: z.string(), value: z.string() }).nullish();
const dateTime = z.iso.datetime({ offset: true, local: true });

export const releaseShape = { comingSoon: metafield, releaseDate: metafield };

/** Undefined is an ordinary product. Null is a Shopify preview with no announced time. */
export function readReleaseDate({
  comingSoon,
  releaseDate,
}: z.infer<z.ZodObject<typeof releaseShape>>): string | null | undefined {
  if (comingSoon?.type !== "boolean" || comingSoon.value !== "true") return undefined;
  if (releaseDate?.type !== "date_time" || !dateTime.safeParse(releaseDate.value).success)
    return null;
  // Shopify's date_time values without a zone use GMT.
  const value = releaseDate.value;
  const zoned = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`;
  const instant = new Date(zoned);
  return Number.isFinite(instant.getTime()) ? instant.toISOString() : null;
}
