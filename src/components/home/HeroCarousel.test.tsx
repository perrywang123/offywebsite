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
    text: { zh: "让想象发生\n让陪伴发生", en: "Let imagination happen\nLet companionship happen" },
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
    bg: "#fefefe",
    href: "/collections/princess-lady",
    titleImage: "/assets/hero/titles/princess-lady.png",
  },
  {
    image: "/assets/hero/hero-04.jpg",
    bg: "#fefefe",
    href: "/collections/outdoor-sporty",
    titleImage: "/assets/hero/titles/fashion-life.png",
  },
  {
    image: "/assets/hero/hero-03.jpg",
    bg: "#c9b8ab",
    href: "/collections/playful-life",
    titleImage: "/assets/hero/titles/playful-life.png",
  },
];

describe("HeroCarousel", () => {
  it("renders only slides 3-5 as links to the series pages (1/2 not clickable)", () => {
    render(<HeroCarousel slides={slides} locale="zh" />);
    const links = screen.getAllByRole("link", { hidden: true });
    expect(links).toHaveLength(3);
    const slide = (n: number) =>
      links.find((l) => l.getAttribute("aria-label") === `Hero slide ${n}`);
    expect(slide(3)).toHaveAttribute("href", "/collections/princess-lady");
    expect(slide(4)).toHaveAttribute("href", "/collections/outdoor-sporty");
    expect(slide(5)).toHaveAttribute("href", "/collections/playful-life");
  });

  it("renders the is.offy hand-written wordmark image on slide 1", () => {
    render(<HeroCarousel slides={slides} locale="zh" />);
    expect(screen.getByAltText("is.offy")).toHaveAttribute(
      "src",
      "/assets/brand/is-offy-wordmark.png",
    );
  });

  it("renders the slide-1 two-line slogan", () => {
    render(<HeroCarousel slides={slides} locale="zh" />);
    // whitespace-pre-line 下 DOM 文本含换行,用正则匹配两行内容
    expect(screen.getByText(/让想象发生/)).toBeInTheDocument();
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

  it("renders the promo copy alt text on slide 2", () => {
    render(<HeroCarousel slides={slides} locale="zh" />);
    expect(screen.getByAltText(/送offy包包/)).toHaveAttribute(
      "src",
      "/assets/hero/promo/promo-text.png",
    );
  });

  it("renders OFFY + series title images on slides 3-5", () => {
    const { container } = render(<HeroCarousel slides={slides} locale="zh" />);
    const srcs = Array.from(container.querySelectorAll("img")).map((i) =>
      i.getAttribute("src"),
    );
    expect(srcs).toContain("/assets/hero/titles/princess-lady.png");
    expect(srcs).toContain("/assets/hero/titles/fashion-life.png");
    expect(srcs).toContain("/assets/hero/titles/playful-life.png");
  });

  it("localizes overlay text for en", () => {
    render(<HeroCarousel slides={slides} locale="en" />);
    expect(screen.getByText(/Let imagination happen/)).toBeInTheDocument();
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
