import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import en from "../../../messages/en.json";

const mockUseCart = vi.fn();
vi.mock("./CartProvider", () => ({ useCart: () => mockUseCart() }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

import { CartDrawer } from "./CartDrawer";

function showBag(quantity: number, currency: string, lines = true) {
  mockUseCart.mockReturnValue({
    lines: lines ? [{ code: "test-offy", quantity }] : [],
    catalog: {
      "test-offy": {
        code: "test-offy",
        name: { en: "OFFY", zh: "OFFY" },
        images: ["https://cdn.shopify.com/test.jpg"],
        priceCents: 4590,
        currency,
        available: true,
      },
    },
    catalogLoaded: true,
    catalogStatus: "ready",
    isOpen: true,
    mounted: true,
    refresh: vi.fn().mockResolvedValue(true),
    close: vi.fn(),
    setQty: vi.fn(),
    remove: vi.fn(),
  });
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <CartDrawer />
    </NextIntlClientProvider>,
  );
}

describe("bag shipping notices", () => {
  it.each([
    [1, "USD", "$45.90"],
    [3, "USD", "$137.70"],
    [3, "GBP", "£137.70"],
  ])(
    "keeps both notices fixed for %i items in %s without adding freight",
    (qty, currency, total) => {
      showBag(qty, currency);
      const footer = screen.getByText("Subtotal").closest("footer")!;
      const worldwide = within(footer).getByText("Worldwide shipping: $15 USD per order.");
      const us = within(footer).getByText("US deliveries only: $20 USD for 3+ OFFYs.");
      const checkout = within(footer).getByRole("button", { name: "Checkout" });
      expect(within(footer).getByText(total)).toBeInTheDocument();
      expect(screen.getByText("Subtotal").compareDocumentPosition(worldwide)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
      expect(worldwide.compareDocumentPosition(us)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(us.compareDocumentPosition(checkout)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    },
  );

  it("preserves the existing empty-bag presentation", () => {
    showBag(1, "USD", false);
    expect(screen.getByText("Your bag is empty")).toBeInTheDocument();
    expect(screen.queryByText("Worldwide shipping: $15 USD per order.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Checkout" })).not.toBeInTheDocument();
  });
});
