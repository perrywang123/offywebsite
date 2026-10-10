import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/cart/CartProvider", () => ({
  useCart: () => ({ add: vi.fn(), lines: [], catalog: {}, isOpen: false }),
}));

import { StickyBuyBar } from "./StickyBuyBar";

const base = {
  code: "noir",
  priceCents: 4500,
  currency: "USD",
  locale: "en",
  isAvailable: true,
  isUpcoming: false,
};

const renderBar = (overrides: Partial<typeof base> = {}) =>
  render(<StickyBuyBar {...base} {...overrides} />);

describe("StickyBuyBar (P0: 375px 首屏也必须能加购)", () => {
  it("is a sticky bar, never a fixed one (template.tsx 的 transform 会让 fixed 失效)", () => {
    renderBar();
    const bar = screen.getByTestId("pdp-buybar");
    expect(bar.className).toContain("sticky");
    expect(bar.className).toContain("bottom-0");
    // R2:fixed 会被 animate-page-enter 的 containing block 钉在文档流里
    expect(bar.className).not.toContain("fixed");
    // 桌面端不得出现(信息区已有自己的 Add to Bag)
    expect(bar.className).toContain("md:hidden");
  });

  it("shows the market price and an Add to Bag button when in stock", () => {
    renderBar();
    expect(screen.getByText("$45.00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "addToBag" })).toBeEnabled();
  });

  it("keeps the price but disables the button when sold out", () => {
    renderBar({ isAvailable: false });
    expect(screen.getByText("$45.00")).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: "outOfStock" });
    expect(btn).toBeDisabled();
  });

  it("shows the reveal notice (no dead tap target) for upcoming looks", () => {
    renderBar({ isUpcoming: true, isAvailable: false });
    expect(screen.getByTestId("pdp-buybar")).toBeInTheDocument();
    expect(screen.getByText("upcomingNotice")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText("$45.00")).not.toBeInTheDocument();
  });

  it("formats the price in the product's own currency, not USD-by-default", () => {
    renderBar({ priceCents: 3790, currency: "GBP" });
    expect(screen.getByText("£37.90")).toBeInTheDocument();
  });
});
