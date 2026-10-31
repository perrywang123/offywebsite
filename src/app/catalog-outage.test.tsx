import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  permanentRedirect: vi.fn(),
}));
vi.mock("@/server/catalog/live", () => ({
  getLiveProducts: vi.fn().mockRejectedValue(new Error("timeout")),
  getLiveSeriesList: vi.fn().mockRejectedValue(new Error("timeout")),
  getLiveProductByCode: vi.fn().mockRejectedValue(new Error("timeout")),
  getLiveProductsBySeries: vi.fn().mockRejectedValue(new Error("timeout")),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
import Products, { generateMetadata } from "./[locale]/products/page";
import Detail, { generateMetadata as productMetadata } from "./[locale]/products/[code]/page";
it("renders branded catalog failure without count or fake products and noindexes the page", async () => {
  render(await Products({ params: Promise.resolve({ locale: "en" }) }));
  expect(screen.getByText("A little pause.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  expect((await generateMetadata({ params: Promise.resolve({ locale: "en" }) })).robots).toEqual({
    index: false,
    follow: true,
  });
});
it("does not turn a product outage into 404 or a product Offer", async () => {
  render(await Detail({ params: Promise.resolve({ locale: "en", code: "swan-princess" }) }));
  expect(screen.getByText("This look is taking a moment.")).toBeInTheDocument();
  expect(document.querySelector('script[type="application/ld+json"]')).toBeNull();
  expect(
    (await productMetadata({ params: Promise.resolve({ locale: "en", code: "swan-princess" }) }))
      .robots,
  ).toEqual({ index: false, follow: true });
});
