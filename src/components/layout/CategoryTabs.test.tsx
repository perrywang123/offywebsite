import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// next-intl's navigation Link transitively imports next/navigation which is not
// resolvable under jsdom; mock it to a plain anchor for presentational tests.
vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { CategoryTabs } from "./CategoryTabs";

const series = [
  { slug: "signature", name: { zh: "经典毛绒", en: "Signature Plush" }, tagline: { zh: "", en: "" } },
  { slug: "bag-charm", name: { zh: "时尚包挂", en: "Bag Charm" }, tagline: { zh: "", en: "" } },
] as const;

describe("CategoryTabs", () => {
  it("renders an 'All' tab linking to the catalog", () => {
    render(<CategoryTabs series={[...series]} active={undefined} locale="en" />);
    const all = screen.getByRole("link", { name: "All" });
    expect(all).toHaveAttribute("href", "/products");
  });

  it("renders one tab per series linking to its collection", () => {
    render(<CategoryTabs series={[...series]} active={undefined} locale="en" />);
    expect(screen.getByRole("link", { name: "Signature Plush" })).toHaveAttribute(
      "href",
      "/collections/signature",
    );
    expect(screen.getByRole("link", { name: "Bag Charm" })).toHaveAttribute(
      "href",
      "/collections/bag-charm",
    );
  });

  it("marks the active tab bold and aria-current", () => {
    render(<CategoryTabs series={[...series]} active="signature" locale="en" />);
    const active = screen.getByRole("link", { name: "Signature Plush" });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(active.className).toContain("font-bold");
  });

  it("sticks below the header while scrolling", () => {
    render(<CategoryTabs series={[...series]} active={undefined} locale="en" />);
    const bar = screen.getByRole("tablist", { name: /categories/i });
    expect(bar.className).toContain("sticky");
  });

  it("localizes labels for zh", () => {
    render(<CategoryTabs series={[...series]} active={undefined} locale="zh" />);
    expect(screen.getByRole("link", { name: "经典毛绒" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "全部" })).toBeInTheDocument();
  });
});
