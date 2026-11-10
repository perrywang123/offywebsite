import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { testProduct } from "@/test/product";
import { HomeLooks } from "./HomeLooks";
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element -- lightweight image test double
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
const labels = {
  eyebrow: "Find your OFFY",
  featured: "Featured Looks",
  newest: "New Looks",
  description: "A little personality. A look for every mood.",
  viewAll: "Shop all looks",
  regional: "Regional Exclusives",
  regionalDescription: "Available for your destination.",
  empty: "More looks are on their way.",
  series: "Explore the collections",
  soldOut: "Sold out",
};
const series = [
  {
    slug: "princess-lady",
    name: { en: "OFFY Princess Series", zh: "公主系列" },
    heroImage: "",
    tagline: { en: "", zh: "" },
  },
] as const;

describe("homepage looks presentation", () => {
  it("keeps sold-out regional media unlinked and its text detail link accessible", () => {
    render(
      <HomeLooks
        data={{
          source: "newest",
          products: [],
          regionals: [
            testProduct("sold", {
              isAvailable: false,
              images: ["https://cdn.shopify.com/sold.jpg"],
            }),
          ],
        }}
        series={[]}
        locale="en"
        labels={labels}
      />,
    );
    expect(screen.getByRole("img", { name: "Test look" }).closest("a")).toBeNull();
    expect(screen.getByRole("link", { name: "Test look" })).toHaveAttribute(
      "href",
      "/products/sold",
    );
    expect(screen.getByText("Sold out")).toBeVisible();
  });
  it("shows curated names and market prices without requiring hover, separate from regional products", () => {
    const data = {
      source: "featured" as const,
      products: [
        testProduct("main", {
          name: { en: "LITTLE HEIRESS", zh: "LITTLE HEIRESS" },
          currency: "GBP",
          priceCents: 3390,
          images: ["https://cdn.shopify.com/main.jpg"],
        }),
      ],
      regionals: [
        testProduct("exclusive", { name: { en: "UK LOOK", zh: "UK LOOK" }, badge: "GB" }),
      ],
    };
    render(<HomeLooks data={data} series={[...series]} locale="en" labels={labels} />);
    expect(screen.getByRole("heading", { name: "Featured Looks" })).toBeVisible();
    const main = screen.getByRole("region", { name: "Featured Looks" });
    expect(within(main).getByText("£33.90")).toBeVisible();
    expect(within(main).getByRole("link", { name: /LITTLE HEIRESS/ })).toHaveAttribute(
      "href",
      "/products/main",
    );
    expect(within(main).queryByText("UK LOOK")).toBeNull();
    expect(
      within(screen.getByRole("region", { name: "Regional Exclusives" })).getByText("UK LOOK"),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /OFFY Princess Series/ })).toHaveAttribute(
      "href",
      "/collections/princess-lady",
    );
  });

  it("labels live time-based fallback accurately and omits an empty regional section", () => {
    render(
      <HomeLooks
        data={{ source: "newest", products: [testProduct()], regionals: [] }}
        series={[]}
        locale="en"
        labels={labels}
      />,
    );
    expect(screen.getByRole("heading", { name: "New Looks" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Featured Looks" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Regional Exclusives" })).toBeNull();
  });

  it("keeps an explicit empty state and catalog navigation without fabricated cards", () => {
    render(
      <HomeLooks
        data={{ source: "featured", products: [], regionals: [] }}
        series={[]}
        locale="en"
        labels={labels}
      />,
    );
    expect(screen.getByText(labels.empty)).toBeVisible();
    expect(screen.getByRole("link", { name: /Shop all looks/ })).toHaveAttribute(
      "href",
      "/products",
    );
    expect(screen.queryByRole("img")).toBeNull();
  });
});
