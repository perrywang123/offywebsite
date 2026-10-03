import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockClose = vi.fn();
const mockUseCart = vi.fn();

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={typeof src === "string" ? src : ""} />
  ),
}));

vi.mock("@/components/cart/CartProvider", () => ({
  useCart: () => mockUseCart(),
}));

import { CartDrawer } from "./CartDrawer";

function baseCart(overrides: Record<string, unknown> = {}) {
  return {
    lines: [],
    catalog: {},
    catalogLoaded: true,
    isOpen: true,
    mounted: true,
    close: mockClose,
    setQty: vi.fn(),
    remove: vi.fn(),
    ...overrides,
  };
}

describe("CartDrawer a11y (dialog)", () => {
  beforeEach(() => {
    mockUseCart.mockReset();
    mockClose.mockClear();
  });

  it("moves focus into the drawer when opened", () => {
    mockUseCart.mockReturnValue(baseCart());
    render(<CartDrawer />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("closes on Escape", () => {
    mockUseCart.mockReturnValue(baseCart());
    render(<CartDrawer />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("labels the dialog for screen readers", () => {
    mockUseCart.mockReturnValue(baseCart());
    render(<CartDrawer />);
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("dialog")).toHaveAccessibleName();
  });
});

describe("CartDrawer × live catalog (/api/products-backed)", () => {
  beforeEach(() => {
    mockUseCart.mockReset();
    mockClose.mockClear();
  });

  it("renders a cart line using the live catalog entry(name/price/image), not a bundled static import", () => {
    mockUseCart.mockReturnValue(
      baseCart({
        lines: [{ code: "noir", quantity: 2 }],
        catalog: {
          noir: { code: "noir", name: { zh: "诺尔", en: "NOIR" }, images: ["https://cdn.shopify.com/noir.jpg"], priceCents: 4500, available: true },
        },
      }),
    );
    render(<CartDrawer />);
    expect(screen.getByText("诺尔")).toBeInTheDocument();
    expect(screen.getByAltText("NOIR")).toHaveAttribute("src", "https://cdn.shopify.com/noir.jpg");
  });

  it("hides a cart line whose code is not (yet / no longer) present in the live catalog", () => {
    mockUseCart.mockReturnValue(
      baseCart({
        lines: [{ code: "zombie-code", quantity: 1 }],
        catalog: {},
      }),
    );
    render(<CartDrawer />);
    expect(screen.getByText("empty")).toBeInTheDocument();
  });

  it("shows a loading state instead of a false 'empty cart' while the live catalog is still loading", () => {
    mockUseCart.mockReturnValue(
      baseCart({
        lines: [{ code: "noir", quantity: 1 }],
        catalog: {},
        catalogLoaded: false,
      }),
    );
    render(<CartDrawer />);
    expect(screen.queryByText("empty")).not.toBeInTheDocument();
  });
});
