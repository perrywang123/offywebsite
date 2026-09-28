import { render, screen, fireEvent, act } from "@testing-library/react";
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

import { HeroCarousel, type HeroSlide } from "./HeroCarousel";

const slides: HeroSlide[] = [
  {
    image: "/assets/hero/hero-01.jpg",
    bg: "#babbb9",
    wordmark: true,
    text: { zh: "让想象落地 让陪伴发生", en: "Let imagination land, let companionship happen" },
  },
  {
    image: "/assets/hero/promo/doll.png",
    bg: "#ffffff",
    promo: {
      doll: "/assets/hero/promo/doll.png",
      bags: [
        "/assets/hero/promo/bag-1.png",
        "/assets/hero/promo/bag-2.png",
        "/assets/hero/promo/bag-3.png",
        "/assets/hero/promo/bag-4.png",
      ],
      text: "/assets/hero/promo/promo-text.png",
    },
  },
  {
    image: "/assets/hero/hero-02.jpg",
    bg: "#f9f9f9",
    href: "/collections/princess-lady",
    titleImage: "/assets/hero/titles/princess-lady.png",
    subtitleImage: "/assets/hero/titles/sub-princess.png",
    subtitleAlt: { zh: "生活需要仪式感", en: "Life needs a sense of ritual" },
  },
  {
    image: "/assets/hero/hero-04.jpg",
    bg: "#3a383c",
    href: "/collections/outdoor-sporty",
    titleImage: "/assets/hero/titles/fashion-life.png",
    subtitleImage: "/assets/hero/titles/sub-fashion.png",
    subtitleAlt: { zh: "周末出门玩", en: "Weekend outing" },
    dark: true,
  },
  {
    image: "/assets/hero/hero-03.jpg",
    bg: "#fdfdfd",
    href: "/collections/playful-life",
    titleImage: "/assets/hero/titles/playful-life.png",
    subtitleImage: "/assets/hero/titles/sub-playful.png",
    subtitleAlt: { zh: "日常犯可爱", en: "Everyday cute" },
  },
];

describe("HeroCarousel", () => {
  it("renders a details CTA link on each series slide (3-5), not on slides 1-2", () => {
    render(<HeroCarousel slides={slides} locale="zh" />);
    const ctas = screen.getAllByRole("link", { name: "查看详情", hidden: true });
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

  it("renders the slide-1 one-line slogan", () => {
    render(<HeroCarousel slides={slides} locale="zh" />);
    expect(screen.getByText(/让想象落地/)).toBeInTheDocument();
    expect(screen.getByText(/让陪伴发生/)).toBeInTheDocument();
  });

  it("renders the promo composite (doll + 4 bags + text PNG) on slide 2", () => {
    const { container } = render(<HeroCarousel slides={slides} locale="zh" />);
    // mock 的 <img alt=""> 无障碍名为空,getAllByRole 匹配不到;直接查 DOM。
    const srcs = Array.from(container.querySelectorAll("img")).map((i) =>
      i.getAttribute("src"),
    );
    expect(srcs).toContain("/assets/hero/promo/doll.png");
    for (const bag of ["bag-1", "bag-2", "bag-3", "bag-4"]) {
      expect(srcs).toContain(`/assets/hero/promo/${bag}.png`);
    }
    expect(srcs).toContain("/assets/hero/promo/promo-text.png");
  });

  it("renders OFFY title + subtitle images on series slides", () => {
    const { container } = render(<HeroCarousel slides={slides} locale="zh" />);
    const srcs = Array.from(container.querySelectorAll("img")).map((i) =>
      i.getAttribute("src"),
    );
    for (const t of ["princess-lady", "fashion-life", "playful-life"]) {
      expect(srcs).toContain(`/assets/hero/titles/${t}.png`);
    }
    for (const sub of ["sub-princess", "sub-fashion", "sub-playful"]) {
      expect(srcs).toContain(`/assets/hero/titles/${sub}.png`);
    }
  });

  it("renders subtitle alt text localized", () => {
    render(<HeroCarousel slides={slides} locale="zh" />);
    expect(screen.getByAltText("生活需要仪式感")).toBeInTheDocument();
    expect(screen.getByAltText("周末出门玩")).toBeInTheDocument();
    expect(screen.getByAltText("日常犯可爱")).toBeInTheDocument();
  });

  it("uses the white CTA arrow on the dark (fashion) slide and ink arrow elsewhere", () => {
    const { container } = render(<HeroCarousel slides={slides} locale="zh" />);
    const srcs = Array.from(container.querySelectorAll("img")).map((i) =>
      i.getAttribute("src"),
    );
    expect(srcs).toContain("/assets/hero/cta-arrow-white.png");
    expect(srcs).toContain("/assets/hero/cta-arrow.png");
  });

  it("localizes overlay text for en", () => {
    render(<HeroCarousel slides={slides} locale="en" />);
    expect(screen.getByText(/Let imagination land/)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Details", hidden: true })).toHaveLength(3);
  });

  it("advances on next arrow and goes back on prev arrow", () => {
    render(<HeroCarousel slides={slides} locale="zh" intervalMs={60000} />);
    const dots = screen.getAllByRole("tab", { hidden: true });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(dots[1]).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("button", { name: /previous/i }));
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
});
