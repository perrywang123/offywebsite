import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/server/catalog/live", () => ({
  getLiveProducts: vi.fn(),
  getLiveNewLooksProducts: vi.fn(),
  getLiveSeriesList: async () => [],
}));
vi.mock("@/server/catalog/home", () => ({ getHomeLooks: vi.fn() }));
vi.mock("@/server/catalog/regional", () => ({ getRegionalProducts: async () => [] }));
vi.mock("@/components/home/HeroCarousel", () => ({ HeroCarousel: () => <p>OFFY brand hero</p> }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span>{alt}</span> }));
import { getLiveProducts } from "@/server/catalog/live";
import { getHomeLooks } from "@/server/catalog/home";
import { testProduct } from "@/test/product";
import Home from "./[locale]/page";
beforeEach(() => vi.clearAllMocks());
it("keeps independently verified NEWS and brand sections when recommendations fail", async () => {
  vi.mocked(getLiveProducts).mockResolvedValue([
    testProduct("warm-biscuit"),
    testProduct("bunny-hug"),
  ]);
  vi.mocked(getHomeLooks).mockRejectedValue(new Error("timeout"));
  const { container } = render(await Home({ params: Promise.resolve({ locale: "en" }) }));
  expect(screen.getByText("OFFY brand hero")).toBeInTheDocument();
  expect(screen.getByText("newsTitle")).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "rosterTitle" })).toBeInTheDocument();
  expect(container.querySelectorAll("[data-commerce-unavailable]")).toHaveLength(1);
});
it("replaces failed commerce with one panel and preserves editorial content", async () => {
  vi.mocked(getLiveProducts).mockRejectedValue(new Error("timeout"));
  vi.mocked(getHomeLooks).mockRejectedValue(new Error("timeout"));
  const { container } = render(await Home({ params: Promise.resolve({ locale: "en" }) }));
  expect(container.querySelectorAll("[data-commerce-unavailable]")).toHaveLength(1);
  expect(screen.getByText("OFFY brand hero")).toBeInTheDocument();
  expect(screen.getByText("collabTitle", { selector: "h2" })).toBeInTheDocument();
  expect(screen.queryByText("rosterTitle")).toBeNull();
});

it("keeps verified new looks but hides an unverified roster on a partial catalog failure", async () => {
  vi.mocked(getHomeLooks).mockResolvedValue({
    source: "newest",
    products: [testProduct("verified")],
    regionals: [],
  });
  vi.mocked(getLiveProducts).mockRejectedValue(new Error("merch timeout"));
  render(await Home({ params: Promise.resolve({ locale: "en" }) }));
  expect(screen.getByText("featuredTitle")).toBeInTheDocument();
  expect(screen.queryByText("rosterTitle")).toBeNull();
});
