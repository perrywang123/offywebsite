// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { fetchProductBuyerPhotos } from "./buyer-photos";

const validUrl = "https://cdn.shopify.com/s/files/example.jpg";
const image = (url: string, altText: string | null = null) => ({
  __typename: "MediaImage",
  image: { url, altText },
});
const list = (nodes: unknown[]) => ({
  data: { product: { metafield: { type: "list.file_reference", references: { nodes } } } },
});
const reply = (body: unknown, status = 200) =>
  vi.fn<typeof fetch>().mockImplementation(async () => Response.json(body, { status }));

describe("fetchProductBuyerPhotos", () => {
  it("uses this product and market and returns usable Shopify images in field order", async () => {
    const secondUrl = "https://cdn.shopify.com/s/files/second.png?v=1";
    const fetchImpl = reply(
      list([
        image(validUrl, "Offy on a bag"),
        { __typename: "GenericFile" },
        { __typename: "MediaImage", image: null },
        image("https://example.org/untrusted.png"),
        image("http://cdn.shopify.com/insecure.png"),
        image(secondUrl),
      ]),
    );

    await expect(fetchProductBuyerPhotos("red-doll", "gb", fetchImpl)).resolves.toEqual([
      { url: validUrl, alt: "Offy on a bag" },
      { url: secondUrl, alt: null },
    ]);
    const [, init] = fetchImpl.mock.calls[0];
    const request = JSON.parse(String(init?.body));
    expect(request.variables).toEqual({ handle: "red-doll" });
    expect(request.query).toContain("@inContext(country: GB)");
    expect(request.query).toMatch(/namespace:\s*"custom",\s*key:\s*"buyer_photos"/);
    expect(init?.cache).toBe("no-store");
  });

  it.each([
    ["missing field", { data: { product: { metafield: null } } }],
    ["missing product", { data: { product: null } }],
    ["empty references", list([])],
    ["invalid references", list([{ __typename: "GenericFile" }, image("not a url")])],
    ["wrong field type", { data: { product: { metafield: { type: "single_line_text_field" } } } }],
    [
      "malformed response",
      {
        data: {
          product: { metafield: { type: "list.file_reference", references: { nodes: {} } } },
        },
      },
    ],
    [
      "GraphQL error with partial data",
      { ...list([image(validUrl)]), errors: [{ message: "denied" }] },
    ],
  ])("returns an empty gallery for %s", async (_reason, body) => {
    await expect(fetchProductBuyerPhotos("red-doll", "US", reply(body))).resolves.toEqual([]);
  });

  it("omits the gallery when Shopify is unreachable or answers with a non-success status", async () => {
    const unreachable = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("unreachable"));
    await expect(fetchProductBuyerPhotos("red-doll", "US", unreachable)).resolves.toEqual([]);
    await expect(fetchProductBuyerPhotos("red-doll", "US", reply({}, 503))).resolves.toEqual([]);
  });
});
