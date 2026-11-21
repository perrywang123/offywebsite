// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { fetchProductDetailMedia } from "./product-detail-media";

const photo = (id: string, name: string, altText: string | null = null) => ({
  id: `gid://shopify/ProductImage/${id}`,
  url: `https://cdn.shopify.com/offy/${name}.jpg`,
  width: 1200,
  height: 1600,
  altText,
});
const imageRef = (image: ReturnType<typeof photo>) => ({ __typename: "MediaImage", image });
function response(product: unknown) {
  return vi.fn<typeof fetch>(async () => Response.json({ data: { product } }));
}

describe("optional Shopify detail photos", () => {
  it("orders verified guide roles independently of the current product gallery order", async () => {
    const fetcher = response({
      images: {
        nodes: [
          photo("59175257637153", "craft"),
          photo("9", "front"),
          photo("58710519513377", "size"),
          photo("58713533546785", "neon-detail"),
        ],
      },
    });
    const media = await fetchProductDetailMedia("offy_redrush", "us", fetcher);
    expect(media.guides.map(({ url }) => url)).toEqual([
      "https://cdn.shopify.com/offy/size.jpg",
      "https://cdn.shopify.com/offy/craft.jpg",
    ]);
    expect(media.details.map(({ url }) => url)).toEqual([
      "https://cdn.shopify.com/offy/neon-detail.jpg",
    ]);
    expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string).query).toContain(
      "@inContext(country: US)",
    );
  });

  it("uses explicit product fields when present and keeps usable references in Shopify order", async () => {
    const explicitSize = photo("1", "alternate-size", "Length and width measurements");
    const result = await fetchProductDetailMedia(
      "x",
      "US",
      response({
        images: { nodes: [photo("58710519513377", "old-shared-size"), photo("4", "ordinary")] },
        measurements: { reference: imageRef(explicitSize) },
        closeups: {
          references: {
            nodes: [
              imageRef(photo("3", "close-up")),
              { __typename: "GenericFile" },
              imageRef({ ...photo("4", "x"), url: "https://another.example/close-up.jpg" }),
              imageRef(photo("5", "another-detail")),
            ],
          },
        },
      }),
    );
    expect(result.guides.map(({ url, alt }) => [url, alt])).toEqual([
      [explicitSize.url, explicitSize.altText],
    ]);
    expect(result.details.map(({ url }) => url)).toEqual([
      "https://cdn.shopify.com/offy/close-up.jpg",
      "https://cdn.shopify.com/offy/another-detail.jpg",
    ]);
  });

  it("uses the three verified BURGER DOLL close-ups only if the exact sheet is attached", async () => {
    const sheet = { ...photo("58710519349537", "burger-collage"), width: 1200, height: 1200 };
    const result = await fetchProductDetailMedia(
      "burger-doll",
      "US",
      response({ images: { nodes: [sheet] } }),
    );
    expect(result.details).toHaveLength(3);
    expect(result.details.every((detail) => detail.url === sheet.url && Boolean(detail.crop))).toBe(
      true,
    );
    expect(
      await fetchProductDetailMedia("burger-doll", "US", response({ images: { nodes: [] } })),
    ).toEqual({ details: [], guides: [] });
  });

  it("omits details after a Shopify read failure", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, { status: 503 }));
    expect(await fetchProductDetailMedia("offy_redrush", "US", fetcher)).toEqual({
      details: [],
      guides: [],
    });
  });
});
