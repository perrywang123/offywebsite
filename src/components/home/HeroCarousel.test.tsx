import { render, screen, fireEvent, createEvent, act } from "@testing-library/react";
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

/**
 * jsdom 的 `matchMedia` 由 `src/test/setup.ts` 统一桩成 `matches: false`。
 * 这里临时换成"系统开了 Reduce Motion",用完复原(组件在 effect 里读它,
 * 所以必须在 render 之前换)。
 */
function stubReducedMotion(matches: boolean) {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion") ? matches : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

/**
 * 受控时钟:组件算松手速度时读 `performance.now()`。
 *
 * 为什么必须接管:jsdom 给的速度源有两个坑 ——
 *  1. `event.timeStamp` 是 **epoch 毫秒**(不是规范里的 DOMHighResTimeStamp),
 *     同一 tick 内派发的事件完全同值(dt=0),构造不出"快速轻扫";
 *  2. 不接管而用真实时钟的话,两次 `fireEvent` 之间的真实耗时(受测试機负载
 *     影响,几十 ms 都可能)会被当成指速 —— "25px 的慢拖"偶尔会被算成
 *     25px/20ms = 1.25px/ms 的轻扫,断言随机翻红(实测复现过)。
 *
 * 所以凡是"期望不翻页"的慢手势,都要用这个时钟把时间拉开。
 */
function controlledClock() {
  let now = 0;
  const spy = vi.spyOn(performance, "now").mockImplementation(() => now);
  return {
    at: (ms: number) => {
      now = ms;
    },
    restore: () => spy.mockRestore(),
  };
}

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

  it("桌面鼠标拖拽也能切屏(Pointer Events;箭头隐藏后桌面唯一的手势入口)", () => {
    const clock = controlledClock();
    try {
      render(<HeroCarousel slides={slides} locale="zh" intervalMs={60000} />);
      const region = screen.getByRole("region", { hidden: true });
      const dots = screen.getAllByRole("tab", { hidden: true });
      /**
       * 一次完整鼠标拖拽:按下 → 移动(中途几帧) → 松手,阈值 40px。
       * 每一帧之间把受控时钟往前推 200ms:这样"20px 的手抖"既过不了位移阈值、
       * 也算不出速度(否则真实耗时会让它偶尔变成"快速轻扫"而翻页)。
       */
      let t = 0;
      const drag = (from: number, to: number) => {
        const opts = { pointerId: 1, pointerType: "mouse", isPrimary: true };
        clock.at((t += 200));
        fireEvent.pointerDown(region, { ...opts, clientX: from });
        clock.at((t += 200));
        fireEvent.pointerMove(region, { ...opts, clientX: from + (to - from) / 3 });
        clock.at((t += 200));
        fireEvent.pointerMove(region, { ...opts, clientX: from + ((to - from) * 2) / 3 });
        clock.at((t += 200));
        fireEvent.pointerUp(region, { ...opts, clientX: to });
      };
      drag(300, 100);
      expect(dots[1]).toHaveAttribute("aria-selected", "true");
      drag(100, 300);
      expect(dots[0]).toHaveAttribute("aria-selected", "true");
      // 未过阈值(20px)不算滑动 —— 只是手抖,不能切屏
      drag(300, 280);
      expect(dots[0]).toHaveAttribute("aria-selected", "true");
    } finally {
      clock.restore();
    }
  });

  it("一次触摸手势只切一屏:pointer 事件(touch)与 touch 事件不会各切一次", () => {
    // 真实浏览器里一次手指横滑会**同时**派发 pointerdown/up 与 touchstart/end。
    // 两条通路各切一屏 = 一次手势跳过两屏,必须在实现里避免。
    render(<HeroCarousel slides={slides} locale="zh" intervalMs={60000} />);
    const region = screen.getByRole("region", { hidden: true });
    const dots = screen.getAllByRole("tab", { hidden: true });
    fireEvent.pointerDown(region, { pointerId: 2, pointerType: "touch", clientX: 300 });
    fireEvent.touchStart(region, { touches: [{ clientX: 300 }] });
    fireEvent.pointerMove(region, { pointerId: 2, pointerType: "touch", clientX: 120 });
    fireEvent.touchMove(region, { touches: [{ clientX: 120 }] });
    fireEvent.pointerUp(region, { pointerId: 2, pointerType: "touch", clientX: 100 });
    fireEvent.touchEnd(region, { changedTouches: [{ clientX: 100 }] });
    expect(dots[1]).toHaveAttribute("aria-selected", "true");
    expect(dots[2]).toHaveAttribute("aria-selected", "false");
  });

  it("判定为滑动后吞掉紧随的 click(5 屏全是整屏 <a>,否则浏览器补发的 click 会误跳转)", () => {
    const { container } = render(<HeroCarousel slides={slides} locale="zh" intervalMs={60000} />);
    const region = screen.getByRole("region", { hidden: true });
    const dots = screen.getAllByRole("tab", { hidden: true });
    const link = container.querySelector('a[href="/about"]') as HTMLAnchorElement;
    // 监听器只负责 preventDefault(免得 jsdom 真的去导航),同时充当"click 有没有被放行"的探针
    const reachedLink = vi.fn((e: MouseEvent) => e.preventDefault());
    link.addEventListener("click", reachedLink);

    // ① 触摸横滑过阈值 → 同一次手势的合成 click 必须被吞
    fireEvent.touchStart(region, { touches: [{ clientX: 300 }] });
    fireEvent.touchEnd(region, { changedTouches: [{ clientX: 100 }] });
    expect(dots[1]).toHaveAttribute("aria-selected", "true");
    // detail: 1 = 真实指针手势补发的 click(浏览器实测值;键盘/脚本触发的是 0)
    const afterSwipe = createEvent.click(link, { detail: 1 });
    fireEvent(link, afterSwipe);
    expect(afterSwipe.defaultPrevented).toBe(true);
    expect(reachedLink).not.toHaveBeenCalled();

    // ①b 键盘 Enter(detail 0)不能被上一次滑动的标记连坐
    const keyboard = createEvent.click(link, { detail: 0 });
    fireEvent(link, keyboard);
    expect(reachedLink).toHaveBeenCalledTimes(1);

    // ② 新手势没到阈值(手抖 5px) → 守卫必须已复位,click 照常放行
    fireEvent.touchStart(region, { touches: [{ clientX: 300 }] });
    fireEvent.touchEnd(region, { changedTouches: [{ clientX: 295 }] });
    fireEvent(link, createEvent.click(link, { detail: 1 }));
    expect(reachedLink).toHaveBeenCalledTimes(2);

    // ③ 鼠标拖拽同理:拖过阈值后补发的 click 也要被吞
    const mouse = { pointerId: 1, pointerType: "mouse", isPrimary: true };
    fireEvent.pointerDown(region, { ...mouse, clientX: 300 });
    fireEvent.pointerMove(region, { ...mouse, clientX: 150 });
    fireEvent.pointerUp(region, { ...mouse, clientX: 100 });
    fireEvent(link, createEvent.click(link, { detail: 1 }));
    expect(reachedLink).toHaveBeenCalledTimes(2);
  });

  it("拖了但**没到切屏阈值**(24–39px):画面跟手过、弹回、不切屏,但 click 必须被吞(否则「拖一半跳走」)", () => {
    // 这条是老板反馈的"拖一半跳走":切屏门槛是 40px,但吞 click 的标志过去也用 40px,
    // 于是 30px 的拖拽 = 画面跟手 → 松手弹回 → **然后跳到该屏落地页**。
    // 现在吞 click 用更低的 24px 独立门槛:24–39px 的拖拽不切屏、也不跳转。
    render(<HeroCarousel slides={slides} locale="zh" intervalMs={5000} />);
    const region = screen.getByTestId("hero-track").parentElement as HTMLElement;
    const link = screen.getAllByRole("link", { hidden: true })[0];
    let reachedLink = 0;
    link.addEventListener("click", (e) => {
      if (!e.defaultPrevented) reachedLink += 1;
    });
    const mouse = { pointerId: 1, pointerType: "mouse", isPrimary: true };
    fireEvent.pointerDown(region, { ...mouse, clientX: 300 });
    fireEvent.pointerMove(region, { ...mouse, clientX: 270 }); // dx = -30,未到 40
    fireEvent.pointerUp(region, { ...mouse, clientX: 270 });
    // 没切屏(位移不足、也不是快速轻扫)
    expect(screen.getAllByRole("tab", { hidden: true })[0]?.getAttribute("aria-selected")).toBe("true");
    // 但 click 被吞了 —— 这是本条的重点
    fireEvent(link, createEvent.click(link, { detail: 1 }));
    expect(reachedLink).toBe(0);
  });

  it("暂停控件:原生 button、有 aria-label 与 aria-pressed,暂停后停、再按恢复", () => {
    vi.useFakeTimers();
    try {
      render(<HeroCarousel slides={slides} locale="zh" intervalMs={5000} />);
      const dots = screen.getAllByRole("tab", { hidden: true });
      const pause = screen.getByRole("button", { name: "暂停自动轮播" });
      // 可键盘访问 = 原生 button(type=button 避免未来套进 form 里变成提交按钮)
      expect(pause.tagName).toBe("BUTTON");
      expect(pause).toHaveAttribute("type", "button");
      expect(pause).toHaveAttribute("aria-pressed", "false");

      fireEvent.click(pause);
      const play = screen.getByRole("button", { name: "播放自动轮播" });
      expect(play).toHaveAttribute("aria-pressed", "true");
      act(() => {
        vi.advanceTimersByTime(20000);
      });
      expect(dots[0]).toHaveAttribute("aria-selected", "true"); // 4 个周期一次都没动

      fireEvent.click(play);
      expect(screen.getByRole("button", { name: "暂停自动轮播" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(dots[1]).toHaveAttribute("aria-selected", "true"); // 恢复后重新开始计时
    } finally {
      vi.useRealTimers();
    }
  });

  it("暂停控件文案随 locale 切换(en)", () => {
    render(<HeroCarousel slides={slides} locale="en" intervalMs={60000} />);
    expect(screen.getByRole("button", { name: "Pause autoplay" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pause autoplay" }));
    expect(screen.getByRole("button", { name: "Play autoplay" })).toBeInTheDocument();
  });

  it("prefers-reduced-motion: reduce 下默认不自动播放,但用户仍可手动开启", () => {
    vi.useFakeTimers();
    const restoreMatchMedia = stubReducedMotion(true);
    try {
      render(<HeroCarousel slides={slides} locale="zh" intervalMs={5000} />);
      const dots = screen.getAllByRole("tab", { hidden: true });
      // 默认就是"已暂停":控件直接呈现「播放」态且 aria-pressed=true
      const play = screen.getByRole("button", { name: "播放自动轮播" });
      expect(play).toHaveAttribute("aria-pressed", "true");
      act(() => {
        vi.advanceTimersByTime(20000);
      });
      expect(dots[0]).toHaveAttribute("aria-selected", "true");

      // 显式开启后照常轮播(Reduce Motion 是默认值,不是禁用)
      fireEvent.click(play);
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(dots[1]).toHaveAttribute("aria-selected", "true");
    } finally {
      restoreMatchMedia();
      vi.useRealTimers();
    }
  });

  it("暂停控件命中区 ≥44px,且不新增整屏链接(仍是 5 条)", () => {
    const { container } = render(<HeroCarousel slides={slides} locale="zh" intervalMs={60000} />);
    const pause = screen.getByRole("button", { name: "暂停自动轮播" });
    expect(pause.className).toContain("h-[clamp(44px,2.7cqw,48px)]");
    expect(pause.className).toContain("w-[clamp(44px,2.7cqw,48px)]");
    // 控件层是 pointer-events-none,子元素必须自己打开命中
    expect(pause.className).toContain("pointer-events-auto");
    // 导航入口没被这次改动改变
    expect(container.querySelectorAll("a.absolute.inset-0")).toHaveLength(5);
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

/**
 * 拖拽跟手动画(老板 2026-10 反馈:头图「用手拖拽滑动的效果有点差,会直接闪过去」)。
 *
 * 改之前的实现是**纯阈值跳转**:拖拽全程没有任何位移反馈(手指滑 100px 图片纹丝
 * 不动),松手时直接 `go()` 换索引 —— 因为 5 屏是绝对定位叠着做 opacity 交叉淡出,
 * 换索引 = 图片瞬间替换,视觉上就是"闪"。这一组用例锁住补上来的五件事:
 *   1. 跟手:拖拽中轨道实时 `translateX`;
 *   2. 阻尼:头/尾屏的越界方向位移衰减(给出"到头了"的手感);
 *   3. 双阈值:位移 ≥40px **或** 速度 >0.5px/ms(快速轻扫)都翻页;
 *   4. 弹性吸附:松手后带 easing 归位,不是瞬间跳回;
 *   5. 拖拽期间暂停自动轮播,松手后重新计时。
 *
 * ⚠️ 这一段断的是**轨道的内联 `transform`**:jsdom 不做布局,
 * `getBoundingClientRect()` 恒为 0,所以"跟手"在这里只能断样式字符串;
 * 真实浏览器里的 rect 实测值由 `tmp/hero-drag/verify-drag.mjs`(CDP)采集。
 */
describe("HeroCarousel 拖拽跟手动画", () => {
  const MOUSE = { pointerId: 1, pointerType: "mouse", isPrimary: true } as const;

  /** 跟手位移的载体:包住 5 屏的轨道层(控件层在它外面,不跟着动)。 */
  const track = (container: HTMLElement) => {
    const el = container.querySelector<HTMLElement>('[data-testid="hero-track"]');
    if (!el) throw new Error("找不到轨道层 [data-testid=hero-track]");
    return el;
  };

  /** 轨道当前的内联位移(px)。实现里只会写 `translateX(<px>)`,没写 = 0。 */
  const shift = (container: HTMLElement) => {
    const m = /translateX\((-?[\d.]+)px\)/.exec(track(container).style.transform);
    return m ? Number(m[1]) : 0;
  };

  it("跟手:拖拽中轨道实时 translateX(鼠标与手指共用同一套位移状态)", () => {
    const { container } = render(<HeroCarousel slides={slides} locale="zh" intervalMs={60000} />);
    const region = screen.getByRole("region", { hidden: true });

    // ① 鼠标:按下还没动 → 0;之后移动 1px,画面跟 1px
    fireEvent.pointerDown(region, { ...MOUSE, clientX: 300 });
    expect(shift(container)).toBe(0);
    fireEvent.pointerMove(region, { ...MOUSE, clientX: 240 }); // dx = -60(下一屏方向)
    expect(shift(container)).toBe(-60);
    fireEvent.pointerMove(region, { ...MOUSE, clientX: 180 });
    expect(shift(container)).toBe(-120);
    fireEvent.pointerUp(region, { ...MOUSE, clientX: 180 });

    // ② 手指走的是另一条事件通路(touch 事件;pointerType=touch 的 pointer 事件被
    //    实现故意跳过),位移状态必须共用 —— 不能只给鼠标做跟手。
    fireEvent.touchStart(region, { touches: [{ clientX: 300 }] });
    fireEvent.touchMove(region, { touches: [{ clientX: 250 }] });
    expect(shift(container)).toBe(-50);
    fireEvent.touchMove(region, { touches: [{ clientX: 210 }] });
    expect(shift(container)).toBe(-90);
    fireEvent.touchEnd(region, { changedTouches: [{ clientX: 210 }] });

    // ③ 跟手的是图片轨道,指示条/暂停钮所在的控件层留在原地(不跟着滑出去)
    const firstDot = screen.getAllByRole("tab", { hidden: true })[0];
    expect(track(container).contains(firstDot)).toBe(false);
  });

  it("未过阈值松手:带 easing 弹回原位(不是瞬间归位),且不切屏", () => {
    // 用受控时钟把这一拖"拖慢"(25px 走 200ms):否则真实耗时可能让它落进
    // "位移小但速度快"的轻扫通道 —— 那就是另一条正确行为,不该在这里断言。
    const clock = controlledClock();
    try {
      const { container } = render(<HeroCarousel slides={slides} locale="zh" intervalMs={60000} />);
      const region = screen.getByRole("region", { hidden: true });
      const dots = screen.getAllByRole("tab", { hidden: true });

      clock.at(0);
      fireEvent.pointerDown(region, { ...MOUSE, clientX: 300 });
      clock.at(200);
      fireEvent.pointerMove(region, { ...MOUSE, clientX: 275 }); // dx = -25 < 40
      expect(shift(container)).toBe(-25);
      // 跟手期间必须**关掉**过渡:否则位移会带 280ms 延迟追手指,手感发飘
      expect(track(container).style.transition).toBe("none");

      clock.at(400);
      fireEvent.pointerUp(region, { ...MOUSE, clientX: 275 });
      expect(dots[0]).toHaveAttribute("aria-selected", "true"); // 没翻页
      expect(shift(container)).toBe(0); // 回到原位
      // 而且这一下归位是**带 easing 的动画**,不是瞬间赋值 —— 这是"不闪"的关键
      expect(track(container).style.transition).toMatch(/^transform \d+ms cubic-bezier/);
    } finally {
      clock.restore();
    }
  });

  it("快速轻扫(位移 <40px、速度 >0.5px/ms)也翻页;速度只取最后 120ms,不用整段平均", () => {
    const clock = controlledClock();
    try {
      const { container } = render(<HeroCarousel slides={slides} locale="zh" intervalMs={60000} />);
      const region = screen.getByRole("region", { hidden: true });
      const dots = screen.getAllByRole("tab", { hidden: true });

      // ① 先慢后快的一甩:总位移 36px(<40 位移阈值),但**松手前那一小段**很快
      //    (末尾 17ms 走了 32px ≈ 1.9px/ms)。慢速起手在 300ms 前 —— 采样窗口
      //    只看最后 ~120ms,所以它不进窗口;而整段平均只有 36/317 ≈ 0.11px/ms,
      //    用整段平均的实现在这里必然漏判(这是"快速轻扫不翻页"的根因)。
      clock.at(800);
      fireEvent.pointerDown(region, { ...MOUSE, clientX: 300 });
      clock.at(1100);
      fireEvent.pointerMove(region, { ...MOUSE, clientX: 296 }); // 慢:4px / 300ms
      clock.at(1110);
      fireEvent.pointerMove(region, { ...MOUSE, clientX: 288 });
      clock.at(1115);
      fireEvent.pointerMove(region, { ...MOUSE, clientX: 276 }); // 快:12px / 5ms
      clock.at(1117);
      fireEvent.pointerUp(region, { ...MOUSE, clientX: 264 }); // 总位移 -36
      expect(shift(container)).toBe(0);
      expect(dots[1]).toHaveAttribute("aria-selected", "true");

      // ② 同样 36px 但慢慢挪(0.06px/ms)→ 不翻页:不能"只要动了就翻"
      clock.at(2000);
      fireEvent.pointerDown(region, { ...MOUSE, clientX: 300 });
      clock.at(2300);
      fireEvent.pointerMove(region, { ...MOUSE, clientX: 281 });
      clock.at(2600);
      fireEvent.pointerUp(region, { ...MOUSE, clientX: 264 });
      expect(dots[1]).toHaveAttribute("aria-selected", "true");
      expect(dots[2]).toHaveAttribute("aria-selected", "false");
    } finally {
      clock.restore();
    }
  });

  it("阻尼:头屏/尾屏的越界方向位移衰减到 35%,合法方向不衰减", () => {
    const { container } = render(<HeroCarousel slides={slides} locale="zh" intervalMs={60000} />);
    const region = screen.getByRole("region", { hidden: true });
    const dots = screen.getAllByRole("tab", { hidden: true });

    // ① 第一屏向右拉 = 退到"第 0 屏之前"(不存在)→ 100px 只走 35px
    fireEvent.pointerDown(region, { ...MOUSE, clientX: 200 });
    fireEvent.pointerMove(region, { ...MOUSE, clientX: 300 }); // dx = +100
    expect(shift(container)).toBe(35);
    // ② 同一屏向左拉 = 下一屏(存在)→ 全量跟手
    fireEvent.pointerMove(region, { ...MOUSE, clientX: 100 }); // dx = -100
    expect(shift(container)).toBe(-100);
    fireEvent.pointerUp(region, { ...MOUSE, clientX: 100 });

    // ③ 最后一屏向左拉 = 进到"第 4 屏之后"(不存在)→ 衰减
    fireEvent.click(dots[4]);
    fireEvent.pointerDown(region, { ...MOUSE, clientX: 300 });
    fireEvent.pointerMove(region, { ...MOUSE, clientX: 200 }); // dx = -100
    expect(shift(container)).toBe(-35);
    // ④ 同一屏向右拉 = 上一屏(存在)→ 全量
    fireEvent.pointerMove(region, { ...MOUSE, clientX: 400 }); // dx = +100
    expect(shift(container)).toBe(100);
    fireEvent.pointerUp(region, { ...MOUSE, clientX: 400 });
  });

  it("prefers-reduced-motion: reduce 下不跟手、也不做弹性过渡(直接切屏)", () => {
    const restoreMatchMedia = stubReducedMotion(true);
    try {
      const { container } = render(<HeroCarousel slides={slides} locale="zh" intervalMs={60000} />);
      const region = screen.getByRole("region", { hidden: true });
      const dots = screen.getAllByRole("tab", { hidden: true });

      fireEvent.pointerDown(region, { ...MOUSE, clientX: 300 });
      fireEvent.pointerMove(region, { ...MOUSE, clientX: 100 }); // dx = -200
      expect(track(container).style.transform).toBe(""); // 不跟手
      expect(track(container).style.transition).toBe(""); // 也不塞过渡
      fireEvent.pointerUp(region, { ...MOUSE, clientX: 100 });
      // 该切的屏照切(无障碍只砍动画,不砍功能)
      expect(dots[1]).toHaveAttribute("aria-selected", "true");
      expect(track(container).style.transform).toBe("");
      expect(track(container).style.transition).toBe("");
    } finally {
      restoreMatchMedia();
    }
  });

  it("拖拽期间暂停自动轮播,松手后重新计时", () => {
    vi.useFakeTimers();
    try {
      render(<HeroCarousel slides={slides} locale="zh" intervalMs={5000} />);
      const region = screen.getByRole("region", { hidden: true });
      const dots = screen.getAllByRole("tab", { hidden: true });

      fireEvent.pointerDown(region, { ...MOUSE, clientX: 300 });
      act(() => {
        vi.advanceTimersByTime(20000); // 按住不放 4 个周期
      });
      expect(dots[0]).toHaveAttribute("aria-selected", "true"); // 一次都没被计时器抢走

      fireEvent.pointerUp(region, { ...MOUSE, clientX: 300 });
      act(() => {
        vi.advanceTimersByTime(5000); // 松手后重新计时
      });
      expect(dots[1]).toHaveAttribute("aria-selected", "true");
    } finally {
      vi.useRealTimers();
    }
  });

  it("跟手只用 transform:不动 width/margin,头图高度仍由 aspect-ratio 决定", () => {
    const { container } = render(<HeroCarousel slides={slides} locale="zh" intervalMs={60000} />);
    const region = screen.getByRole("region", { hidden: true });

    fireEvent.pointerDown(region, { ...MOUSE, clientX: 300 });
    fireEvent.pointerMove(region, { ...MOUSE, clientX: 120 });
    fireEvent.pointerUp(region, { ...MOUSE, clientX: 120 });

    // 外层高度容器一动没动(改 width/margin 会连带 aspect-ratio 高度、引起回流)
    expect(region.style.aspectRatio).toBe("3250 / 2041");
    expect(region.style.height).toBe("");
    const st = track(container).style;
    for (const prop of ["width", "height", "marginLeft", "marginRight", "left", "paddingLeft"]) {
      expect(st[prop as "width"]).toBe("");
    }
    // 位移被 overflow-hidden 收在头图内:375px 下拖动不会顶出横向滚动条
    expect(region.className).toContain("overflow-hidden");
  });
});
