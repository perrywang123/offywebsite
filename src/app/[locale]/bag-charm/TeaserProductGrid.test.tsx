import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={typeof src === "string" ? src : ""} />
  ),
}));

import { TeaserProductGrid, type TeaserProductItem } from "./TeaserProductGrid";

const items: TeaserProductItem[] = [
  { code: "WCOFFY-XXX01", image: "/assets/bag-charm/prod-1.png" },
  { code: "WCOFFY-XXX02", image: "/assets/bag-charm/prod-2.png" },
];

const texts = {
  viewDetailLabel: "点击查看",
  closeLabel: "关闭预览",
  quickViewLabel: "商品大图预览",
};

const HOVER_DELAY = 1000;

/** 默认模拟为非 hover 能力设备(触屏),按需在单个用例里覆盖为 hover 能力(桌面鼠标)。 */
function mockMatchMedia(hoverCapable: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: hoverCapable,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe("TeaserProductGrid (quick-view popover, no page navigation)", () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it("renders all product codes and view-detail triggers, with no <a> navigation", () => {
    const { container } = render(<TeaserProductGrid items={items} {...texts} />);
    expect(screen.getByText("WCOFFY-XXX01")).toBeInTheDocument();
    expect(screen.getByText("WCOFFY-XXX02")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /点击查看/ })).toHaveLength(2);
    // 需求:不跳转其他页面 —— 确认没有渲染任何 <a> 链接
    expect(container.querySelectorAll("a")).toHaveLength(0);
  });

  it("opens the quick-view dialog with the large image when clicking 点击查看", () => {
    render(<TeaserProductGrid items={items} {...texts} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /点击查看/ })[0]!);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    // 浮窗内展示该商品的大图(与卡片缩略图使用同一张图,但是独立渲染的元素)
    const dialogImages = dialog.querySelectorAll("img");
    expect(Array.from(dialogImages).some((img) => img.getAttribute("src") === "/assets/bag-charm/prod-1.png")).toBe(true);
  });

  it("toggles closed when clicking 点击查看 again on the same product", () => {
    render(<TeaserProductGrid items={items} {...texts} />);
    const trigger = screen.getAllByRole("button", { name: /点击查看/ })[0]!;
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("switches the dialog image when clicking a different product's trigger", () => {
    render(<TeaserProductGrid items={items} {...texts} />);
    const [first, second] = screen.getAllByRole("button", { name: /点击查看/ });
    fireEvent.click(first!);
    expect(screen.getByRole("dialog").querySelector('img[src="/assets/bag-charm/prod-1.png"]')).toBeTruthy();
    fireEvent.click(second!);
    expect(screen.getByRole("dialog").querySelector('img[src="/assets/bag-charm/prod-2.png"]')).toBeTruthy();
  });

  it("closes when the Escape key is pressed", () => {
    render(<TeaserProductGrid items={items} {...texts} />);
    fireEvent.click(screen.getAllByRole("button", { name: /点击查看/ })[0]!);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes when clicking the backdrop (outside the panel)", () => {
    render(<TeaserProductGrid items={items} {...texts} />);
    fireEvent.click(screen.getAllByRole("button", { name: /点击查看/ })[0]!);
    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes via the explicit close (✕) button without closing when clicking inside the panel", () => {
    render(<TeaserProductGrid items={items} {...texts} />);
    fireEvent.click(screen.getAllByRole("button", { name: /点击查看/ })[0]!);
    const dialog = screen.getByRole("dialog");
    const panelImg = dialog.querySelector('img[src="/assets/bag-charm/prod-1.png"]')!;
    fireEvent.click(panelImg); // 点击浮窗内部(图片)不应关闭,事件已 stopPropagation
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /关闭预览/ }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does NOT open immediately on mouse enter — requires a 1s hover dwell (desktop hover-capable)", () => {
    vi.useFakeTimers();
    mockMatchMedia(true);
    render(<TeaserProductGrid items={items} {...texts} />);
    const card = screen.getByText("WCOFFY-XXX01").closest(".group")!;

    fireEvent.mouseEnter(card);
    // 刚悬停,远未满 —— 不应弹出
    act(() => {
      vi.advanceTimersByTime(HOVER_DELAY - 1);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // 满 1s —— 弹出
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("cancels the pending hover-open if the cursor leaves the card before the dwell elapses", () => {
    vi.useFakeTimers();
    mockMatchMedia(true);
    render(<TeaserProductGrid items={items} {...texts} />);
    const card = screen.getByText("WCOFFY-XXX01").closest(".group")!;

    fireEvent.mouseEnter(card);
    act(() => {
      vi.advanceTimersByTime(HOVER_DELAY - 400); // 尚未满停留时长
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.mouseLeave(card); // 未满即移出 —— 应取消待打开计时器
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("opens the panel after a real-mouse-move to the backdrop, then auto-closes shortly after (desktop hover)", () => {
    vi.useFakeTimers();
    mockMatchMedia(true);
    render(<TeaserProductGrid items={items} {...texts} />);
    const card = screen.getByText("WCOFFY-XXX01").closest(".group")!;

    fireEvent.mouseEnter(card);
    act(() => {
      vi.advanceTimersByTime(HOVER_DELAY);
    });
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // 鼠标真实移动到遮罩空白区域(面板之外)—— 注意:关闭不再由卡片的
    // mouseLeave 触发(该事件在浮窗插入 DOM 后可能被浏览器引擎在指针静止时
    // 合成重放,不可靠),而是由浮窗遮罩自身的 mousemove 触发(该事件只会随
    // 真实指针移动产生),详见组件顶部注释第 2 点。
    fireEvent.mouseMove(dialog);
    // 150ms 宽限期内仍应保持打开
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("does NOT auto-close when the cursor moves within the panel itself", () => {
    vi.useFakeTimers();
    mockMatchMedia(true);
    render(<TeaserProductGrid items={items} {...texts} />);
    const card = screen.getByText("WCOFFY-XXX01").closest(".group")!;

    fireEvent.mouseEnter(card);
    act(() => {
      vi.advanceTimersByTime(HOVER_DELAY);
    });
    const dialog = screen.getByRole("dialog");
    const panel = dialog.querySelector(".quick-view-panel")!;
    // 鼠标在面板内部移动 —— 不应调度关闭
    fireEvent.mouseMove(panel);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("ignores hover (mouseenter/mouseleave) on touch devices and relies on click only", () => {
    vi.useFakeTimers();
    mockMatchMedia(false);
    render(<TeaserProductGrid items={items} {...texts} />);
    const card = screen.getByText("WCOFFY-XXX01").closest(".group")!;
    fireEvent.mouseEnter(card);
    act(() => {
      vi.advanceTimersByTime(HOVER_DELAY);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("clicking 点击查看 opens immediately, even before the hover dwell elapses", () => {
    // 真实用户点击按钮前指针必然先掠过卡片(触发 mouseenter),但点击动作本身
    // 几乎不可能让鼠标停留满该时长 —— 点击必须立即生效,不应该被悬停延迟拖慢。
    vi.useFakeTimers();
    mockMatchMedia(true);
    render(<TeaserProductGrid items={items} {...texts} />);
    const card = screen.getByText("WCOFFY-XXX01").closest(".group")!;

    fireEvent.mouseEnter(card); // 悬停计时器启动,但远未满停留时长
    act(() => {
      vi.advanceTimersByTime(200);
    });
    fireEvent.click(screen.getAllByRole("button", { name: /点击查看/ })[0]!);
    expect(screen.getByRole("dialog")).toBeInTheDocument(); // 应立即打开(钉住)

    // 即使之后悬停计时器"本该"触发的时间点也过去了,也不应有任何副作用
    act(() => {
      vi.advanceTimersByTime(HOVER_DELAY);
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("real-mouse race: clicking the trigger right after hover-open PINS it open (does not immediately close)", () => {
    // 真机场景复现:鼠标指针在点击按钮前必然先掠过卡片触发 mouseenter
    // (停留满后弹出预览),紧接着点击不应把刚打开的"临时预览"误判为
    // "已打开→本次应关闭"。
    vi.useFakeTimers();
    mockMatchMedia(true);
    render(<TeaserProductGrid items={items} {...texts} />);
    const card = screen.getByText("WCOFFY-XXX01").closest(".group")!;

    fireEvent.mouseEnter(card);
    act(() => {
      vi.advanceTimersByTime(HOVER_DELAY);
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument(); // 悬停打开(临时态)

    fireEvent.click(screen.getAllByRole("button", { name: /点击查看/ })[0]!); // 紧接着点击
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument(); // 应保持打开(被钉住),而非关闭

    // 钉住后,即使鼠标真实移动到遮罩空白区域也不应自动关闭
    fireEvent.mouseMove(dialog);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // 钉住态下再次点击同一按钮 → 真正关闭
    fireEvent.click(screen.getAllByRole("button", { name: /点击查看/ })[0]!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
