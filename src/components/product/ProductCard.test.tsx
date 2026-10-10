import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Product } from "@/lib/catalog";

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

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={typeof src === "string" ? src : ""} />
  ),
}));

import { ProductCard } from "./ProductCard";

function make(overrides: Partial<Product> = {}): Product {
  return {
    code: "PCOF1-A3",
    slug: "pcof1-a3",
    series: "playful-life",
    name: { zh: "网球甜心", en: "Tennis Ace" },
    description: { zh: "", en: "" },
    priceCents: 4500,
    currency: "USD",
    dimensions: null,
    images: ["/assets/products/p10.png"],
    emotionTags: { zh: [], en: [] },
    featured: false,
    isAvailable: true,
    isUpcoming: false,
    isQuoteOnly: false,
    sortOrder: 0,
    ...overrides,
  };
}

describe("ProductCard", () => {
  it("links to the product detail page", () => {
    render(<ProductCard product={make()} locale="en" />);
    expect(screen.getAllByRole("link")[0]).toHaveAttribute("href", "/products/PCOF1-A3");
  });

  it("shows the localized name and price", () => {
    render(<ProductCard product={make()} locale="en" />);
    expect(screen.getAllByText("Tennis Ace").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$45.00").length).toBeGreaterThan(0);
  });

  it("shows the zh name for zh locale", () => {
    render(<ProductCard product={make()} locale="zh" />);
    expect(screen.getAllByText("网球甜心").length).toBeGreaterThan(0);
  });

  it("renders a second image for hover cross-fade when provided", () => {
    render(
      <ProductCard
        product={make({ images: ["/assets/products/p10.png", "/assets/products/p11.png"] })}
        locale="en"
      />,
    );
    expect(screen.getAllByRole("img")).toHaveLength(2);
  });

  it("renders a single image when only one is provided", () => {
    render(<ProductCard product={make()} locale="en" />);
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("hides the price and shows a reveal label for upcoming looks", () => {
    render(<ProductCard product={make({ isUpcoming: true })} locale="en" />);
    expect(screen.queryByText("$45.00")).not.toBeInTheDocument();
    expect(screen.getAllByText(/revealing soon/i).length).toBeGreaterThan(0);
  });
});

describe("ProductCard caption=code (design-draft look cards)", () => {
  it("shows the product code instead of the name", () => {
    render(<ProductCard product={make()} locale="en" caption="code" />);
    expect(screen.getAllByText("PCOF1-A3").length).toBeGreaterThan(0);
    expect(screen.queryByText("Tennis Ace")).not.toBeInTheDocument();
  });

  it("formats the price via Intl currency formatting for zh locale (US$ prefix, no ad-hoc 美元 suffix)", () => {
    render(<ProductCard product={make({ priceCents: 2200 })} locale="zh" caption="code" />);
    expect(screen.getAllByText("US$22.00").length).toBeGreaterThan(0);
  });

  it("keeps the USD price format for en locale", () => {
    render(<ProductCard product={make({ priceCents: 2200 })} locale="en" caption="code" />);
    expect(screen.getAllByText("$22.00").length).toBeGreaterThan(0);
  });
});

describe("ProductCard regional badge", () => {
  it("renders the U.S. only badge", () => {
    render(<ProductCard product={make({ badge: "US" })} locale="en" />);
    expect(screen.getByText(/AVAILABLE IN THE U\.S\. ONLY/)).toBeInTheDocument();
  });

  it("renders the UK only badge", () => {
    render(<ProductCard product={make({ badge: "UK" })} locale="en" />);
    expect(screen.getByText(/AVAILABLE IN THE UK ONLY/)).toBeInTheDocument();
  });

  it("renders no badge when absent", () => {
    render(<ProductCard product={make()} locale="en" />);
    expect(screen.queryByText(/AVAILABLE IN THE/)).not.toBeInTheDocument();
  });
});
