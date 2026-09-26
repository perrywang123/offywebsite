import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockClose = vi.fn();

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
  useCart: () => ({
    lines: [],
    isOpen: true,
    mounted: true,
    close: mockClose,
    setQty: vi.fn(),
    remove: vi.fn(),
  }),
}));

import { CartDrawer } from "./CartDrawer";

describe("CartDrawer a11y (dialog)", () => {
  it("moves focus into the drawer when opened", () => {
    render(<CartDrawer />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("closes on Escape", () => {
    mockClose.mockClear();
    render(<CartDrawer />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("labels the dialog for screen readers", () => {
    render(<CartDrawer />);
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("dialog")).toHaveAccessibleName();
  });
});
