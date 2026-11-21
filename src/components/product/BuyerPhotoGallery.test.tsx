import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import { BuyerPhotoGallery } from "./BuyerPhotoGallery";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

function renderGallery(count = 4) {
  return render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
      <BuyerPhotoGallery
        productName="OFFY"
        photos={Array.from({ length: count }, (_, index) => ({
          url: "https://cdn.shopify.com/test-" + (index + 1) + ".jpg",
          alt: index === 0 ? "Offy on a bag" : null,
        }))}
      />
    </NextIntlClientProvider>,
  );
}

describe("BuyerPhotoGallery", () => {
  it("shows at most three unlabeled previews in order and a named gallery trigger", () => {
    renderGallery();
    const region = screen.getByRole("region", { name: "OFFY in the wild" });
    expect(within(region).getByRole("button", { name: "View gallery" })).toBeVisible();
    expect(
      within(region)
        .getAllByRole("img")
        .map((img) => img.getAttribute("src")),
    ).toEqual([
      "https://cdn.shopify.com/test-1.jpg",
      "https://cdn.shopify.com/test-2.jpg",
      "https://cdn.shopify.com/test-3.jpg",
    ]);
    expect(within(region).queryByText("Offy on a bag")).not.toBeInTheDocument();
  });

  it("opens a selected photo, reaches a fourth photo, and restores focus on close", () => {
    renderGallery();
    const dialog = screen.getByRole("dialog", { hidden: true }) as HTMLDialogElement;
    dialog.showModal = () => {
      dialog.open = true;
    };
    dialog.close = () => {
      dialog.open = false;
      fireEvent(dialog, new Event("close"));
    };
    const third = screen.getByRole("button", { name: "Open photo 3 of 4" });
    fireEvent.click(third);
    expect(dialog).toHaveAttribute("open");
    expect(within(dialog).getByText("3 / 4")).toBeVisible();
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(within(dialog).getByText("4 / 4")).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Next photo" })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close photo gallery" }));
    expect(dialog).not.toHaveAttribute("open");
    expect(third).toHaveFocus();
  });
});
