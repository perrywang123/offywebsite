import { render, screen, within } from "@testing-library/react";
import { createTranslator } from "next-intl";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import { fetchProductGiftOffers } from "@/server/shopify/product-gifts";
import { ProductGiftOffers } from "./ProductGiftOffers";

vi.mock("@/server/shopify/product-gifts", () => ({ fetchProductGiftOffers: vi.fn() }));

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: "product.gifts") =>
    createTranslator({ locale: "en", messages: en, namespace }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

it("shows verified gifts under a static heading with the current English copy", async () => {
  vi.mocked(fetchProductGiftOffers).mockResolvedValue({
    tiers: [
      { minimum: 1, name: "Stickers", handle: "offy-sticker-sheet" },
      { minimum: 3, name: "Big tote", handle: "offy-tote-bag" },
      { minimum: 6, name: "SWAN QUEEN", handle: "swan-princess" },
    ].map((tier) => ({ ...tier, id: tier.handle, url: "/gift.jpg" })),
  });

  render(
    await ProductGiftOffers({
      handle: "bunny-hug",
      country: "US",
      variantId: "gid://shopify/ProductVariant/1",
    }),
  );

  const section = screen.getByRole("region", { name: "Gifts with purchase" });
  const gifts = within(section);
  expect(gifts.getByRole("heading", { name: "Gifts with purchase" })).toBeVisible();
  expect(gifts.getByText("Buy Any OFFY")).toBeVisible();
  expect(gifts.getByText("Buy 3 OFFYs")).toBeVisible();
  expect(gifts.getByText("Buy 6 OFFYs")).toBeVisible();
  expect(gifts.getByText("All eligible gifts are automatically included.")).toBeVisible();
  const sticker = gifts.getByRole("link", { name: "Stickers Buy Any OFFY" });
  expect(sticker.closest("details")).toBeNull();
  const photo = within(sticker).getByAltText("");
  expect(photo).toHaveClass("object-cover");
  expect(photo.parentElement).toHaveClass("aspect-[3/4]");
});
