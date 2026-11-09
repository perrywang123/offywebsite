import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
import ProductNotFound from "./not-found";
it("offers a safe way back when a look is unavailable without inventing product facts or checkout", () => {
  render(<ProductNotFound />);
  expect(screen.getByRole("heading", { name: "This look isn’t available here." })).toBeVisible();
  expect(screen.getByRole("link", { name: "Explore available OFFYs" })).toHaveAttribute(
    "href",
    "/products",
  );
  expect(screen.queryByRole("button", { name: /checkout/i })).toBeNull();
});
