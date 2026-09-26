import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

import { NewsGrid } from "./NewsGrid";
import type { NewsItem } from "@/lib/content";

const feature = { image: "/assets/news/news-01.jpg", href: "/products" };
const items: NewsItem[] = [
  { id: "a", title: { zh: "日常犯可爱", en: "Everyday cute" }, image: "/assets/news/news-04.jpg" },
  { id: "b", title: { zh: "周末出门玩", en: "Weekend outing" }, image: "/assets/news/news-03.jpg" },
  { id: "c", title: { zh: "时尚潮流生活", en: "Fashion Lifestyle" }, image: "/assets/news/news-08.jpg" },
  { id: "d", title: { zh: "趣味潮流OFFY", en: "Playful trendy Offy" }, image: "/assets/news/news-02.jpg" },
];
const texts = { badge: "新品上市", featureTitle: "仪式感生活", cta: "查看详情", browseAll: "逛全部系列" };

describe("NewsGrid (editorial layout)", () => {
  it("renders the feature card with badge, headline and CTA", () => {
    render(<NewsGrid feature={feature} items={items} texts={texts} locale="zh" />);
    expect(screen.getByText("新品上市")).toBeInTheDocument();
    expect(screen.getByText("仪式感生活")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /查看详情/ })).toHaveAttribute("href", "/products");
    expect(screen.getByAltText("仪式感生活")).toHaveAttribute("src", "/assets/news/news-01.jpg");
  });

  it("renders the 2×2 secondary cards with localized titles", () => {
    render(<NewsGrid feature={feature} items={items} texts={texts} locale="zh" />);
    expect(screen.getByText("日常犯可爱")).toBeInTheDocument();
    expect(screen.getByText("周末出门玩")).toBeInTheDocument();
    expect(screen.getByText("时尚潮流生活")).toBeInTheDocument();
    expect(screen.getByText("趣味潮流OFFY")).toBeInTheDocument();
  });

  it("localizes secondary titles for en", () => {
    render(<NewsGrid feature={feature} items={items} texts={texts} locale="en" />);
    expect(screen.getByText("Weekend outing")).toBeInTheDocument();
    expect(screen.getByText("Fashion Lifestyle")).toBeInTheDocument();
  });

  it("renders the browse-all CTA linking to products", () => {
    render(<NewsGrid feature={feature} items={items} texts={texts} locale="zh" />);
    expect(screen.getByRole("link", { name: /逛全部系列/ })).toHaveAttribute("href", "/products");
  });
});
