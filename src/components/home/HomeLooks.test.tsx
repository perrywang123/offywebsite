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
  featured: "FEATURED",
  viewAll: "Shop all looks",
  regional: "REGIONAL EXCLUSIVE",
  empty: "More looks are on their way.",
};

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
    render(<HomeLooks data={data} locale="en" labels={labels} />);
    expect(screen.getByRole("heading", { name: "FEATURED" })).toBeVisible();
    const main = screen.getByRole("region", { name: "FEATURED" });
    expect(within(main).getAllByText("£33.90")[1]).toBeVisible();
    expect(within(main).getAllByRole("link", { name: /LITTLE HEIRESS/ })[0]).toHaveAttribute(
      "href",
      "/products/main",
    );
    expect(within(main).queryByText("UK LOOK")).toBeNull();
    expect(
      within(screen.getByRole("region", { name: "REGIONAL EXCLUSIVE" })).getAllByText("UK LOOK")[1],
    ).toBeVisible();
    const featuredHeading = screen.getByRole("heading", { name: "FEATURED", level: 3 });
    const regionalHeading = screen.getByRole("heading", { name: "REGIONAL EXCLUSIVE", level: 3 });
    expect(regionalHeading.className).toBe(featuredHeading.className);
    expect(within(main).getByRole("img").parentElement).toHaveClass("aspect-[4/5]");
    expect(screen.queryByRole("navigation", { name: "Explore the collections" })).toBeNull();
  });

  it("keeps FEATURED as the display title for live fallback and omits an empty regional section", () => {
    render(
      <HomeLooks
        data={{ source: "newest", products: [testProduct()], regionals: [] }}
        locale="en"
        labels={labels}
      />,
    );
    expect(screen.getByRole("heading", { name: "FEATURED", level: 3 })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "New Looks" })).toBeNull();
    expect(screen.queryByRole("region", { name: "REGIONAL EXCLUSIVE" })).toBeNull();
  });

  it("keeps an explicit empty state and catalog navigation without fabricated cards", () => {
    render(
      <HomeLooks
        data={{ source: "featured", products: [], regionals: [] }}
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
