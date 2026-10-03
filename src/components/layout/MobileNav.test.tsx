import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Series } from "@/lib/catalog";

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>{children}</a>
  ),
  usePathname: () => "/",
}));

vi.mock("./LanguageSwitcher", () => ({
  LanguageSwitcher: () => <button type="button">EN</button>,
}));

import { MobileNav } from "./MobileNav";

// 测试固定的系列数据(与真实 getLiveSeriesList() 解耦,仅验证组件按 props 渲染)。
const testSeries: Series[] = [
  {
    slug: "princess-lady",
    name: { zh: "公主lady系列", en: "OFFY Princess Series" },
    tagline: { zh: "x", en: "x" },
    heroImage: "/assets/hero/hero-02.jpg",
  },
];

describe("MobileNav", () => {
  it("starts closed with the drawer hidden from the a11y tree", () => {
    render(<MobileNav series={testSeries} />);
    expect(screen.getByRole("button", { name: /menu/i })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog", { hidden: false })).not.toBeInTheDocument();
  });

  it("opens the drawer with nav links on hamburger tap", () => {
    render(<MobileNav series={testSeries} />);
    fireEvent.click(screen.getByRole("button", { name: /menu/i }));
    expect(screen.getByRole("button", { name: /menu/i })).toHaveAttribute("aria-expanded", "true");
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "新品" })).toHaveAttribute("href", "/products");
    expect(screen.getByRole("link", { name: "系列" })).toHaveAttribute("href", "/collections");
    expect(screen.getByRole("link", { name: "nav.about" })).toHaveAttribute("href", "/about");
    // 系列子链接的名称来自 props(实时数据),而不是本地静态 seriesList
    expect(screen.getByRole("link", { name: "公主lady系列" })).toHaveAttribute("href", "/collections/princess-lady");
  });

  it("closes on Escape", () => {
    render(<MobileNav series={testSeries} />);
    fireEvent.click(screen.getByRole("button", { name: /menu/i }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("button", { name: /menu/i })).toHaveAttribute("aria-expanded", "false");
  });

  it("closes when the backdrop is tapped", () => {
    render(<MobileNav series={testSeries} />);
    fireEvent.click(screen.getByRole("button", { name: /menu/i }));
    fireEvent.click(screen.getByTestId("mobile-nav-backdrop"));
    expect(screen.getByRole("button", { name: /menu/i })).toHaveAttribute("aria-expanded", "false");
  });

  it("closes after a nav link is followed", () => {
    render(<MobileNav series={testSeries} />);
    fireEvent.click(screen.getByRole("button", { name: /menu/i }));
    fireEvent.click(screen.getByRole("link", { name: "新品" }));
    expect(screen.getByRole("button", { name: /menu/i })).toHaveAttribute("aria-expanded", "false");
  });
});
