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

const feature = { image: "/assets/news/news-01.jpg", productCode: "warm-biscuit" };
const items: NewsItem[] = [
  { id: "a", title: { zh: "日常犯可爱", en: "Everyday cute" }, image: "/assets/news/news-04.jpg", productCode: "bunny-hug" },
  { id: "b", title: { zh: "周末出门玩", en: "Weekend outing" }, image: "/assets/news/news-03.jpg", productCode: "ace" },
  { id: "c", title: { zh: "时尚潮流生活", en: "Fashion Lifestyle" }, image: "/assets/news/news-08.jpg", productCode: "wander" },
  { id: "d", title: { zh: "趣味潮流OFFY", en: "Playful trendy Offy" }, image: "/assets/news/news-02.jpg", productCode: "offy_redrush" },
];
const texts = { badge: "新品上市", featureTitle: "仪式感生活", cta: "查看详情", browseAll: "逛全部系列" };

describe("NewsGrid (editorial layout, data-driven: productCode + image + copy)", () => {
  it("renders the feature card with badge/headline, and the whole card links to its bound product detail page", () => {
    render(<NewsGrid feature={feature} items={items} texts={texts} locale="zh" />);
    expect(screen.getByText("新品上市")).toBeInTheDocument();
    expect(screen.getByText("仪式感生活")).toBeInTheDocument();
    expect(screen.getByText("查看详情")).toBeInTheDocument();
    // 整张大卡(含图)是一个 Link,指向 feature.productCode 对应的商品详情页
    expect(screen.getByRole("link", { name: /仪式感生活/ })).toHaveAttribute(
      "href",
      "/products/warm-biscuit",
    );
    expect(screen.getByAltText("仪式感生活")).toHaveAttribute("src", "/assets/news/news-01.jpg");
  });

  it("renders the 2×2 secondary cards with localized titles, each linking to its own bound product", () => {
    render(<NewsGrid feature={feature} items={items} texts={texts} locale="zh" />);
    expect(screen.getByText("日常犯可爱")).toBeInTheDocument();
    expect(screen.getByText("周末出门玩")).toBeInTheDocument();
    expect(screen.getByText("时尚潮流生活")).toBeInTheDocument();
    expect(screen.getByText("趣味潮流OFFY")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /日常犯可爱/ })).toHaveAttribute("href", "/products/bunny-hug");
    expect(screen.getByRole("link", { name: /周末出门玩/ })).toHaveAttribute("href", "/products/ace");
    expect(screen.getByRole("link", { name: /时尚潮流生活/ })).toHaveAttribute("href", "/products/wander");
    expect(screen.getByRole("link", { name: /趣味潮流OFFY/ })).toHaveAttribute("href", "/products/offy_redrush");
  });

  it("localizes secondary titles for en", () => {
    render(<NewsGrid feature={feature} items={items} texts={texts} locale="en" />);
    expect(screen.getByText("Weekend outing")).toBeInTheDocument();
    expect(screen.getByText("Fashion Lifestyle")).toBeInTheDocument();
  });

  it("renders the browse-all CTA linking to the full product catalog (unaffected by per-card productCode)", () => {
    render(<NewsGrid feature={feature} items={items} texts={texts} locale="zh" />);
    expect(screen.getByRole("link", { name: /逛全部系列/ })).toHaveAttribute("href", "/products");
  });

  it("changing only the data (productCode/image/copy) reflects immediately with no component changes needed", () => {
    const customFeature = { image: "/assets/news/custom.jpg", productCode: "swan-princess" };
    const customItems: NewsItem[] = [
      { id: "x", title: { zh: "新文案", en: "New copy" }, image: "/assets/news/custom-2.jpg", productCode: "pink-mallow" },
    ];
    render(<NewsGrid feature={customFeature} items={customItems} texts={texts} locale="zh" />);
    expect(screen.getByRole("link", { name: /仪式感生活/ })).toHaveAttribute("href", "/products/swan-princess");
    expect(screen.getByRole("link", { name: /新文案/ })).toHaveAttribute("href", "/products/pink-mallow");
  });
});
