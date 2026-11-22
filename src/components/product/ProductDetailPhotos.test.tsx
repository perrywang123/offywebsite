import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import { fetchProductDetailMedia } from "@/server/shopify/product-detail-media";
import { ProductDetailPhotos } from "./ProductDetailPhotos";

vi.mock("@/server/shopify/product-detail-media", () => ({ fetchProductDetailMedia: vi.fn() }));

const closeup = { url: "/close-up.jpg", alt: "Fabric close-up", width: 750, height: 1000 };
const sizeGuide = {
  url: "/size-guide.jpg",
  alt: "Size and measurements",
  width: 750,
  height: 1000,
};

it("renders the size guide and keeps the separate close-up section hidden", async () => {
  vi.mocked(fetchProductDetailMedia).mockResolvedValue({ details: [closeup], guides: [sizeGuide] });

  render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
      {await ProductDetailPhotos({ handle: "bunny-hug", country: "US" })}
    </NextIntlClientProvider>,
  );

  expect(screen.getByRole("button", { name: "Enlarge Size and measurements" })).toBeVisible();
  expect(screen.queryByRole("heading", { name: "The little details" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Enlarge Fabric close-up" })).toBeNull();
});

it("omits the supplemental photo section if Shopify only has close-ups", async () => {
  vi.mocked(fetchProductDetailMedia).mockResolvedValue({ details: [closeup], guides: [] });

  expect(await ProductDetailPhotos({ handle: "bunny-hug", country: "US" })).toBeNull();
});
