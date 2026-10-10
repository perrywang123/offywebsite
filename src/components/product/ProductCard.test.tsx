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
  default: ({ alt, src, className }: { alt: string; src: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={typeof src === "string" ? src : ""} className={className} />
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

  it("swaps to the short 'US ONLY' pill below sm, and exposes the full sentence exactly once (#4/#18/#27 / R7)", () => {
    render(<ProductCard product={make({ badge: "US" })} locale="en" />);
    // 短文案只在窄屏可见,且对读屏隐藏(aria-hidden)
    const short = screen.getByText(/US ONLY/, { selector: "span[aria-hidden]" });
    expect(short.className).toContain("sm:hidden");
    expect(short.textContent).not.toContain("AVAILABLE IN");
    // 完整句在窄屏走 sr-only(仍可被读屏读到),sm 起才可见
    const full = screen.getByText(/AVAILABLE IN THE U\.S\. ONLY/);
    expect(full.className).toContain("sr-only");
    expect(full.className).toContain("sm:not-sr-only");
    // 徽章字号抬到站内 11px 下限
    expect(short.closest("span[class*='bg-[#c8102e]']")?.className).toContain("text-[11px]");
  });

  it("uses the ISO shorthand for other countries (GB normalizes to UK)", () => {
    render(<ProductCard product={make({ badge: "GB" })} locale="en" />);
    expect(screen.getByText(/UK ONLY/, { selector: "span[aria-hidden]" })).toBeInTheDocument();
  });
});

describe("ProductCard long names (mobile two-row info block)", () => {
  it("no longer truncates the name to one line below sm, and gives it a 44px tap target (#5/#19/#24/#31)", () => {
    render(<ProductCard product={make()} locale="en" />);
    const heading = screen.getAllByRole("heading", { name: "Tennis Ace" })[1];
    expect(heading.className).toContain("max-sm:line-clamp-2");
    // 无前缀的 truncate 会把窄屏名称砍到 80px;只有在 sm 起才恢复单行截断
    expect(heading.className).not.toMatch(/(^|\s)truncate(\s|$)/);
    expect(heading.className).toContain("sm:truncate");
    const nameLink = heading.closest("a");
    expect(nameLink?.className).toContain("tap-target--quiet");
  });

  it("stacks name and price vertically below sm, and restores the single row from sm up", () => {
    const { container } = render(<ProductCard product={make()} locale="en" />);
    const row = container.querySelector("div.flex.flex-col");
    expect(row?.className).toContain("sm:flex-row");
    // 价格仍是决策信息,不被挤压
    expect(row?.querySelector("span.shrink-0")?.textContent).toBe("$45.00");
  });
});

describe("ProductCard sold-out presentation (P0-3 companion)", () => {
  it("shows a Sold out pill, dims the image and stops linking the media block", () => {
    const { container } = render(
      <ProductCard product={make({ isAvailable: false })} locale="en" />,
    );
    expect(screen.getByText("Sold out")).toBeInTheDocument();
    expect(container.querySelector("img")?.className).toContain("opacity-60");
    // 图片区不再是链接;只剩下方名称链接可以进详情页
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getAllByRole("link")[0].className).toContain("tap-target--quiet");
  });

  it("keeps the New in badge off a sold-out card (top-left slot belongs to availability)", () => {
    render(<ProductCard product={make({ isAvailable: false, featured: true })} locale="en" />);
    expect(screen.queryByText("New in")).not.toBeInTheDocument();
    expect(screen.getByText("Sold out")).toBeInTheDocument();
  });

  it("does not mark upcoming (not-yet-buyable) products as sold out", () => {
    render(<ProductCard product={make({ isUpcoming: true, isAvailable: false })} locale="en" />);
    expect(screen.queryByText("Sold out")).not.toBeInTheDocument();
    expect(screen.getAllByText(/revealing soon/i).length).toBeGreaterThan(0);
  });

  it("never lets one product carry both a featured flag and a regional badge (B11)", async () => {
    const { products } = await import("@/lib/catalog");
    const both = products.filter((p) => p.featured && p.badge);
    expect(both.map((p) => p.code)).toEqual([]);
  });
});
