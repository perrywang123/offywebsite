import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));

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

import { HeroCarousel, type HeroSlide } from "./HeroCarousel";

const slides: HeroSlide[] = [
  {
    image: "/assets/hero/hero-01.jpg",
    bg: "#babbb9",
    wordmark: true,
    text: { zh: "让想象落地 让陪伴发生", en: "Line one\nLine two" },
  },
  {
    image: "/assets/hero/hero-promo.jpg",
    bg: "#f7f2ef",
    promo: {
      kicker: { zh: "OFFY大促加赠", en: "OFFY MEGA GIVEAWAY" },
      text: { zh: "买三个公仔\n送包包", en: "Buy 3\nget a free tote" },
    },
  },
  {
    image: "/assets/hero/hero-02.jpg",
    bg: "#f9f9f9",
    href: "/collections/princess-lady",
    title: { zh: "公主系列", en: "Princess Series" },
    subtitle: { zh: "生活需要仪式感", en: "Life needs a sense of ritual" },
  },
  {
    image: "/assets/hero/hero-04.jpg",
    bg: "#3a383c",
    href: "/collections/outdoor-sporty",
    title: { zh: "时尚潮流", en: "Streetwear" },
    subtitle: { zh: "周末出门玩", en: "Weekend outing" },
    dark: true,
  },
  {
    image: "/assets/hero/hero-03.jpg",
    bg: "#fdfdfd",
    href: "/collections/playful-life",
    title: { zh: "趣味生活", en: "Playful Life" },
    subtitle: { zh: "日常犯可爱", en: "Everyday cute" },
  },
];

describe("HeroCarousel", () => {
  it("renders a details CTA link on each series slide (3-5), not on slides 1-2", () => {
    render(<HeroCarousel slides={slides} locale="zh" />);
    const ctas = screen.getAllByRole("link", { name: "heroDetailsCta", hidden: true });
    expect(ctas).toHaveLength(3);
    expect(ctas[0]).toHaveAttribute("href", "/collections/princess-lady");
    expect(ctas[1]).toHaveAttribute("href", "/collections/outdoor-sporty");
    expect(ctas[2]).toHaveAttribute("href", "/collections/playful-life");
  });

  it("renders the is.offy hand-written wordmark image on slide 1", () => {
    render(<HeroCarousel slides={slides} locale="zh" />);
    expect(screen.getByAltText("is.offy")).toHaveAttribute(
      "src",
      "/assets/brand/is-offy-wordmark.png",
    );
  });

  it("renders the slide-1 slogan localized by the locale prop", () => {
    render(<HeroCarousel slides={slides} locale="zh" />);
    expect(screen.getByText(/让想象落地/)).toBeInTheDocument();
    expect(screen.getByText(/让陪伴发生/)).toBeInTheDocument();
  });

  it("renders a two-line slide-1 slogan (en, via explicit \\n) without baking it into an image", () => {
    const { container } = render(<HeroCarousel slides={slides} locale="en" />);
    const node = container.querySelector("p.whitespace-pre-line");
    expect(node).toBeTruthy();
    expect(node?.textContent).toBe("Line one\nLine two");
  });

  it("renders the promo slide (bg image with products baked in + live kicker & two-line promo text)", () => {
    const { container } = render(<HeroCarousel slides={slides} locale="zh" />);
    const srcs = Array.from(container.querySelectorAll("img")).map((i) => i.getAttribute("src"));
    expect(srcs).toContain("/assets/hero/hero-promo.jpg");
    expect(screen.getByText("OFFY大促加赠")).toBeInTheDocument();
    // 两行大字:whitespace-pre-line 保留显式 \n 换行
    const promoText = container.querySelector("p.whitespace-pre-line:not(.break-words)");
    expect(promoText?.textContent).toBe("买三个公仔\n送包包");
  });

  it("renders OFFY title + subtitle as live text on series slides (not baked PNGs)", () => {
    render(<HeroCarousel slides={slides} locale="zh" />);
    for (const title of ["公主系列", "时尚潮流", "趣味生活"]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    for (const sub of ["生活需要仪式感", "周末出门玩", "日常犯可爱"]) {
      expect(screen.getByText(sub)).toBeInTheDocument();
    }
  });

  it("uses the white CTA arrow on the dark (fashion) slide and ink arrow elsewhere", () => {
    const { container } = render(<HeroCarousel slides={slides} locale="zh" />);
    const srcs = Array.from(container.querySelectorAll("img")).map((i) => i.getAttribute("src"));
    expect(srcs).toContain("/assets/hero/cta-arrow-white.png");
    expect(srcs).toContain("/assets/hero/cta-arrow.png");
  });

  it("localizes title/subtitle text for en", () => {
    render(<HeroCarousel slides={slides} locale="en" />);
    expect(screen.getByText("Princess Series")).toBeInTheDocument();
    expect(screen.getByText("Life needs a sense of ritual")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "heroDetailsCta", hidden: true })).toHaveLength(3);
  });

  it("advances on next arrow and goes back on prev arrow", () => {
    render(<HeroCarousel slides={slides} locale="zh" intervalMs={60000} />);
    const dots = screen.getAllByRole("tab", { hidden: true });
    fireEvent.click(screen.getByRole("button", { name: "heroNextSlide" }));
    expect(dots[1]).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("button", { name: "heroPrevSlide" }));
    expect(dots[0]).toHaveAttribute("aria-selected", "true");
  });

  it("auto-advances to the next slide", () => {
    vi.useFakeTimers();
    try {
      render(<HeroCarousel slides={slides} locale="zh" intervalMs={5000} />);
      const dots = screen.getAllByRole("tab", { hidden: true });
      expect(dots[0]).toHaveAttribute("aria-selected", "true");
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(dots[1]).toHaveAttribute("aria-selected", "true");
    } finally {
      vi.useRealTimers();
    }
  });

  it("switches slide when a dot is clicked", () => {
    render(<HeroCarousel slides={slides} locale="zh" intervalMs={60000} />);
    const dots = screen.getAllByRole("tab", { hidden: true });
    fireEvent.click(dots[4]);
    expect(dots[4]).toHaveAttribute("aria-selected", "true");
    expect(dots[0]).toHaveAttribute("aria-selected", "false");
  });

  it("advances on left swipe and goes back on right swipe", () => {
    render(<HeroCarousel slides={slides} locale="zh" intervalMs={60000} />);
    const region = screen.getByRole("region", { hidden: true });
    const dots = screen.getAllByRole("tab", { hidden: true });
    fireEvent.touchStart(region, { touches: [{ clientX: 300 }] });
    fireEvent.touchEnd(region, { changedTouches: [{ clientX: 100 }] });
    expect(dots[1]).toHaveAttribute("aria-selected", "true");
    fireEvent.touchStart(region, { touches: [{ clientX: 100 }] });
    fireEvent.touchEnd(region, { changedTouches: [{ clientX: 300 }] });
    expect(dots[0]).toHaveAttribute("aria-selected", "true");
  });

  it("makes the brand / promo screens fully clickable once they carry an href (P1-1)", () => {
    const clickable: HeroSlide[] = [
      { ...slides[0], href: "/about" },
      { ...slides[1], href: "/products" },
      slides[2],
      slides[3],
      slides[4],
    ];
    render(<HeroCarousel slides={clickable} locale="zh" intervalMs={60000} />);
    expect(screen.getByRole("link", { name: /让想象落地/, hidden: true })).toHaveAttribute(
      "href",
      "/about",
    );
    expect(screen.getByRole("link", { name: /OFFY大促加赠/, hidden: true })).toHaveAttribute(
      "href",
      "/products",
    );
    // 屏 3-5 不整屏包链接(内部已有自己的「查看详情」,嵌套 <a> 非法)
    expect(screen.getAllByRole("link", { name: "heroDetailsCta", hidden: true })).toHaveLength(3);
  });

  it("keeps ≥44px hit areas on the hero controls (arrows + indicator) at narrow widths", () => {
    render(<HeroCarousel slides={slides} locale="zh" intervalMs={60000} />);
    for (const name of ["heroPrevSlide", "heroNextSlide"]) {
      const btn = screen.getByRole("button", { name });
      expect(btn.className).toContain("clamp(44px");
      // 桌面端(lg)尺寸必须保持原值
      expect(btn.className).toContain("lg:h-[clamp(30px,3.7cqw,48px)]");
    }
    // 2.8px 高的长条指示器靠伪元素把命中区扩到条上方 40px,视觉尺寸不变
    const dot = screen.getAllByRole("tab", { hidden: true })[0];
    expect(dot.className).toContain("after:h-[calc(100%+2.5rem)]");
  });
});
