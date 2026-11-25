import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "../../../messages/en.json";

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
import type { ComponentProps } from "react";

type Cards = ComponentProps<typeof NewsGrid>["items"];

const feature = { image: "/assets/news/news-01.jpg", href: "/products/warm-biscuit" };
const items: Cards = [
  {
    id: "a",
    title: { zh: "日常犯可爱", en: "Everyday cute" },
    image: "/assets/news/news-04.jpg",
    href: "/products/bunny-hug",
  },
  {
    id: "b",
    title: { zh: "周末出门玩", en: "Weekend outing" },
    image: "/assets/news/news-03.jpg",
    href: "/products/ace",
  },
  {
    id: "c",
    title: { zh: "时尚潮流生活", en: "Fashion Lifestyle" },
    image: "/assets/news/news-08.jpg",
    href: "/products/wander",
  },
  {
    id: "d",
    title: { zh: "趣味潮流OFFY", en: "Playful trendy Offy" },
    image: "/assets/news/news-02.jpg",
    href: "/products/offy_redrush",
  },
];
const texts = {
  featureTitle: "仪式感生活",
  featureAlt: "仪式感生活",
  cta: "查看详情",
  browseAll: "逛全部系列",
};

describe("NewsGrid (editorial layout, data-driven: href + image + copy)", () => {
  it("can omit the headline while retaining an independently named image and card link", () => {
    render(
      <NewsGrid
        feature={feature}
        items={items}
        texts={{
          featureAlt: "Verified SWAN QUEEN",
          cta: "View details",
          browseAll: "Browse all",
        }}
        locale="en"
      />,
    );
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByRole("img", { name: "Verified SWAN QUEEN" })).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Verified SWAN QUEEN — View details" }),
    ).toHaveAttribute("href", "/products/warm-biscuit");
  });
  it("renders the feature card with headline, and the whole card links to its bound product detail page", () => {
    render(<NewsGrid feature={feature} items={items} texts={texts} locale="zh" />);
    expect(screen.getByText("仪式感生活")).toBeInTheDocument();
    expect(screen.getByText("查看详情")).toBeInTheDocument();
    // 整张大卡(含图)是一个 Link,指向 feature.href
    expect(screen.getByRole("link", { name: /仪式感生活/ })).toHaveAttribute(
      "href",
      "/products/warm-biscuit",
    );
    expect(screen.getByAltText("仪式感生活")).toHaveAttribute("src", "/assets/news/news-01.jpg");
  });

  it("主卡不再渲染 NEW ARRIVALS 徽章,标题仍在(老板诉求 3)", () => {
    // 徽章文案按现状传进来:组件必须**不再使用**它(接口保留为可选,字段不删)
    render(
      <NewsGrid
        feature={feature}
        items={items}
        texts={{ ...texts, badge: "New Arrivals" }}
        locale="en"
      />,
    );
    expect(screen.queryByText("New Arrivals")).toBeNull();
    expect(screen.getByRole("heading", { name: /仪式感生活/ })).toBeInTheDocument();
  });

  it("删徽章后大标题的位置由 mt 补偿钉住(`badge 高 + 原 3.5cqw`)", () => {
    const { container } = render(
      <NewsGrid feature={feature} items={items} texts={texts} locale="zh" />,
    );
    const h3 = screen.getByRole("heading", { name: /仪式感生活/ });
    // 徽章原来的行高档位 = text-[max(11px,4.77cqw)] leading-none,必须原样并进 mt
    expect(h3.className).toContain("mt-[calc(max(11px,4.77cqw)+3.5cqw)]");
    // 主卡文字框里只剩标题一个子元素(徽章 <span> 已删)
    expect(container.querySelectorAll("span.text-ink")).toHaveLength(0);
  });

  it("renders the 2×2 secondary cards with localized titles, each linking to its own bound product", () => {
    render(<NewsGrid feature={feature} items={items} texts={texts} locale="zh" />);
    expect(screen.getByText("日常犯可爱")).toBeInTheDocument();
    expect(screen.getByText("周末出门玩")).toBeInTheDocument();
    expect(screen.getByText("时尚潮流生活")).toBeInTheDocument();
    expect(screen.getByText("趣味潮流OFFY")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /日常犯可爱/ })).toHaveAttribute(
      "href",
      "/products/bunny-hug",
    );
    expect(screen.getByRole("link", { name: /周末出门玩/ })).toHaveAttribute(
      "href",
      "/products/ace",
    );
    expect(screen.getByRole("link", { name: /时尚潮流生活/ })).toHaveAttribute(
      "href",
      "/products/wander",
    );
    expect(screen.getByRole("link", { name: /趣味潮流OFFY/ })).toHaveAttribute(
      "href",
      "/products/offy_redrush",
    );
  });

  it("localizes secondary titles for en", () => {
    render(<NewsGrid feature={feature} items={items} texts={texts} locale="en" />);
    expect(screen.getByText("Weekend outing")).toBeInTheDocument();
    expect(screen.getByText("Fashion Lifestyle")).toBeInTheDocument();
  });

  it("keeps the full-card link and configured images for timed and undated previews", () => {
    const serverNow = Date.UTC(2026, 11, 15);
    const releaseAt = "2026-12-18T14:30:00.000Z";
    const snowWhite = {
      ...feature,
      href: "/products/snow-white",
      launch: { releaseAt, serverNow },
    };
    const merryOffy = {
      ...items[0],
      title: { en: "MERRY OFFY", zh: "MERRY OFFY" },
      href: "/products/merry-offy",
      launch: { releaseAt: null, serverNow },
    };
    render(
      <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
        <NewsGrid
          feature={snowWhite}
          items={[merryOffy, ...items.slice(1)]}
          texts={{ featureAlt: "SNOW WHITE", cta: "View details", browseAll: "Browse all" }}
          locale="en"
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getAllByRole("link")).toHaveLength(5);
    const mainLink = screen.getByRole("link", { name: "SNOW WHITE — View details" });
    expect(mainLink).toHaveAttribute("href", "/products/snow-white");
    expect(mainLink).toHaveAccessibleDescription(/coming soon/i);
    expect(mainLink).toHaveAccessibleDescription(/Dec 18.*9:30\s*AM EST/i);
    expect(within(mainLink).getByRole("img")).toHaveAttribute("src", feature.image);
    expect(mainLink.querySelector("time")).toHaveAttribute("datetime", releaseAt);

    const sideLink = screen.getByRole("link", { name: "MERRY OFFY — View details" });
    expect(sideLink).toHaveAttribute("href", "/products/merry-offy");
    expect(sideLink).toHaveAccessibleDescription(/release date to be announced/i);
    expect(within(sideLink).getByRole("img")).toHaveAttribute("src", items[0].image);
    expect(within(sideLink).queryByRole("button")).not.toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Weekend outing/ })).not.toHaveAttribute(
      "aria-describedby",
    );
  });

  it("no longer renders the browse-all CTA — per 最新资讯.psd it moved up under the section title", () => {
    render(<NewsGrid feature={feature} items={items} texts={texts} locale="zh" />);
    expect(screen.queryByRole("link", { name: /逛全部系列/ })).not.toBeInTheDocument();
    // 主卡内的「查看详情」胶囊仍在,并跳绑定商品
    expect(screen.getByRole("link", { name: /查看详情/ })).toHaveAttribute(
      "href",
      "/products/warm-biscuit",
    );
  });

  it("puts each feature/secondary caption inside its own card link (PSD: black pill over the image)", () => {
    render(<NewsGrid feature={feature} items={items} texts={texts} locale="zh" />);
    // 副卡文案进的是卡片自身的链接(原来在图下方独立成 figcaption)
    const card = screen.getByRole("link", { name: /日常犯可爱/ });
    expect(card).toHaveAttribute("href", "/products/bunny-hug");
    expect(card.querySelector("figcaption")).toBeNull();
  });

  it("changing only the data (href/image/copy) reflects immediately with no component changes needed", () => {
    const customFeature = { image: "/assets/news/custom.jpg", href: "/products/swan-princess" };
    const customItems: Cards = [
      {
        id: "x",
        title: { zh: "新文案", en: "New copy" },
        image: "/assets/news/custom-2.jpg",
        href: "/products/pink-mallow",
      },
    ];
    render(<NewsGrid feature={customFeature} items={customItems} texts={texts} locale="zh" />);
    expect(screen.getByRole("link", { name: /仪式感生活/ })).toHaveAttribute(
      "href",
      "/products/swan-princess",
    );
    expect(screen.getByRole("link", { name: /新文案/ })).toHaveAttribute(
      "href",
      "/products/pink-mallow",
    );
  });
});
