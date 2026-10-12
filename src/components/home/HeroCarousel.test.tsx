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
    // 真实数据(lib/content.ts 的 heroSlides)**5 屏都带 href** —— 夹具必须一致,
    // 否则"5 屏整屏可点"这条断言测的是夹具而不是产品行为。
    href: "/about",
    text: { zh: "让想象落地 让陪伴发生", en: "Line one\nLine two" },
  },
  {
    image: "/assets/hero/hero-promo.jpg",
    bg: "#f7f2ef",
    href: "/products",
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
  it("不渲染「查看详情」胶囊(老板诉求 1:隐藏,逻辑保留在开关后)", () => {
    const { container } = render(<HeroCarousel slides={slides} locale="zh" />);
    expect(screen.queryAllByRole("link", { name: "heroDetailsCta", hidden: true })).toHaveLength(0);
    // 「查看详情」原来的箭头 PNG 是它唯一的图源,胶囊没了它也不该再被渲染
    const srcs = Array.from(container.querySelectorAll("img")).map((i) => i.getAttribute("src"));
    expect(srcs).not.toContain("/assets/hero/cta-arrow.png");
    expect(srcs).not.toContain("/assets/hero/cta-arrow-white.png");
  });

  it("不渲染左右箭头按钮(老板诉求 1),手动切换仍剩指示条 + 触摸滑动", () => {
    render(<HeroCarousel slides={slides} locale="zh" />);
    expect(screen.queryAllByRole("button", { name: "heroPrevSlide" })).toHaveLength(0);
    expect(screen.queryAllByRole("button", { name: "heroNextSlide" })).toHaveLength(0);
    // 5 个 tab 指示条仍在,并且仍能直达任意屏
    const dots = screen.getAllByRole("tab", { hidden: true });
    expect(dots).toHaveLength(5);
    fireEvent.click(dots[3]);
    expect(dots[3]).toHaveAttribute("aria-selected", "true");
  });

  it("5 屏**全部**整屏可点(CTA 隐藏后不能留死区;href 集合 = 5 条)", () => {
    const { container } = render(<HeroCarousel slides={slides} locale="zh" />);
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs.sort()).toEqual(
      [
        "/about",
        "/products",
        "/collections/princess-lady",
        "/collections/outdoor-sporty",
        "/collections/playful-life",
      ].sort(),
    );
    // 每屏的整屏链接都是 absolute inset-0 的那层
    expect(container.querySelectorAll("a.absolute.inset-0")).toHaveLength(5);
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

  // 原「深色屏用白色 CTA 箭头」用例随 CTA 一起删除:箭头 PNG 只有 CTA 一个图源,
  // CTA 默认不渲染时该断言已无对象(翻回开关后由真实浏览器截图复核)。

  it("localizes title/subtitle text for en", () => {
    render(<HeroCarousel slides={slides} locale="en" />);
    expect(screen.getByText("Princess Series")).toBeInTheDocument();
    expect(screen.getByText("Life needs a sense of ritual")).toBeInTheDocument();
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

  it("makes **all five** screens fully clickable with their own landing href (P1-1, 诉求 1 补偿)", () => {
    // 改动前:只有屏 1/2 整屏包链接(屏 3-5 内部有自己的「查看详情」);
    // 诉求 1 隐藏 CTA 后,屏 3-5 也必须整屏可点,否则 60% 的头图面积是死区。
    const { container } = render(<HeroCarousel slides={slides} locale="zh" intervalMs={60000} />);
    // 整屏链接 = `absolute inset-0` 那层,断言的是 href ↔ 屏内容的配对
    const screens = Array.from(container.querySelectorAll("a.absolute.inset-0")).map((a) => ({
      href: a.getAttribute("href"),
      text: a.textContent ?? "",
    }));
    expect(screens).toHaveLength(5);
    const pairs: Array<[string, RegExp]> = [
      ["/about", /让想象落地/],
      ["/products", /OFFY大促加赠/],
      ["/collections/princess-lady", /公主系列/],
      ["/collections/outdoor-sporty", /时尚潮流/],
      ["/collections/playful-life", /趣味生活/],
    ];
    const hrefs = screens.map((s) => s.href).sort();
    expect(hrefs).toEqual(pairs.map(([href]) => href).sort());
    for (const [href, text] of pairs) {
      const screen = screens.find((s) => s.href === href);
      expect(screen?.text).toMatch(text);
    }
  });

  it("keeps ≥44px hit areas on the hero controls (indicator bars) at narrow widths", () => {
    render(<HeroCarousel slides={slides} locale="zh" intervalMs={60000} />);
    // 2.8px 高的长条指示器靠伪元素把命中区扩到条上方 —— 箭头隐藏后不再有
    // "向下扩会抢箭头命中区"的约束,扩到 2.65rem(375px 下 ≈45.2px,过 44px 门槛)。
    // 视觉尺寸一点不动(仍 h-[1.18%]),`lg:` 那两行原值保持不动。
    const dots = screen.getAllByRole("tab", { hidden: true });
    expect(dots).toHaveLength(5);
    for (const dot of dots) {
      expect(dot.className).toContain("after:h-[calc(100%+2.65rem)]");
      expect(dot.className).toContain("h-full");
    }
  });
});
