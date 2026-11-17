import { render, screen, fireEvent, createEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ alt, src, className }: { alt: string; src: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={typeof src === "string" ? src : ""} className={className} />
  ),
}));

import { ProductGallery } from "./ProductGallery";

const images = ["https://cdn/a.jpg", "https://cdn/b.jpg", "https://cdn/c.jpg"];

describe("ProductGallery", () => {
  it("renders only the main image when the product has a single image (no strip, no visual change)", () => {
    render(<ProductGallery images={["https://cdn/a.jpg"]} alt="NOIR" sizes="100vw" />);
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("switches the main image when a thumbnail is activated (#17)", async () => {
    const user = userEvent.setup();
    const { container } = render(<ProductGallery images={images} alt="NOIR" sizes="100vw" />);
    // 主图 + 3 张缩略图(缩略图 img 是装饰图,可访问名由 button 的 aria-label 提供)
    expect(container.querySelectorAll("img")).toHaveLength(6);
    expect(screen.getByAltText("NOIR")).toHaveAttribute("src", "https://cdn/a.jpg");

    await user.click(screen.getByRole("button", { name: "NOIR 3" }));

    expect(screen.getByAltText("NOIR")).toHaveAttribute("src", "https://cdn/c.jpg");
    expect(screen.getByRole("button", { name: "NOIR 3" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "NOIR 1" })).not.toHaveAttribute("aria-current");
  });

  it("gives every thumbnail an accessible name and a horizontal-scroll container (#15/#17)", () => {
    const { container } = render(<ProductGallery images={images} alt="NOIR" sizes="100vw" />);
    for (const n of [1, 2, 3]) {
      expect(screen.getByRole("button", { name: `NOIR ${n}` })).toBeInTheDocument();
    }
    // 386px 的条塞进 343px 的屏:必须能横滑(吸附 + 渐隐由 .hscroll 提供)
    expect(container.querySelector(".hscroll")).toBeTruthy();
    // 缩略图不是导航链接
    expect(screen.queryByRole("link")).toBeNull();
  });
});

// These behaviors need a real translating rail, not a src replacement on release.
describe("ProductGallery horizontal gestures", () => {
  const swipe = (region: HTMLElement, from: number, to: number, y = 100) => {
    fireEvent.touchStart(region, { touches: [{ clientX: from, clientY: y }] });
    fireEvent.touchMove(region, { touches: [{ clientX: to, clientY: y }] });
    fireEvent.touchEnd(region, { touches: [], changedTouches: [{ clientX: to, clientY: y }] });
  };
  it("follows touch movement and synchronizes the active thumbnail after settling", () => {
    const { container } = render(<ProductGallery images={images} alt="NOIR" sizes="100vw" />);
    const region = screen.getByRole("region", { name: "NOIR images" });
    fireEvent.touchStart(region, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchMove(region, { touches: [{ clientX: 180, clientY: 100 }] });
    expect(container.querySelector('[data-testid="product-image-track"]')).toHaveStyle({
      transform: "translateX(calc(0% + -120px))",
      transition: "none",
    });
    fireEvent.touchEnd(region, { touches: [], changedTouches: [{ clientX: 180, clientY: 100 }] });
    expect(screen.getByRole("button", { name: "NOIR 2" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByAltText("NOIR")).toHaveAttribute("src", images[1]);
  });
  it("does not wrap at the first or last image", () => {
    render(<ProductGallery images={images} alt="NOIR" sizes="100vw" />);
    const region = screen.getByRole("region", { name: "NOIR images" });
    swipe(region, 100, 300);
    expect(screen.getByRole("button", { name: "NOIR 1" })).toHaveAttribute("aria-current", "true");
    fireEvent.click(screen.getByRole("button", { name: "NOIR 3" }));
    swipe(region, 300, 100);
    expect(screen.getByRole("button", { name: "NOIR 3" })).toHaveAttribute("aria-current", "true");
  });
  it("leaves vertical scrolling alone and abandons cancellation or multiple fingers", () => {
    render(<ProductGallery images={images} alt="NOIR" sizes="100vw" />);
    const region = screen.getByRole("region", { name: "NOIR images" });
    fireEvent.touchStart(region, { touches: [{ clientX: 300, clientY: 100 }] });
    const scroll = createEvent.touchMove(region, {
      touches: [{ clientX: 250, clientY: 300 }],
      cancelable: true,
    });
    fireEvent(region, scroll);
    fireEvent.touchEnd(region, { changedTouches: [{ clientX: 200, clientY: 350 }] });
    expect(scroll.defaultPrevented).toBe(false);
    fireEvent.touchStart(region, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchMove(region, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchCancel(region);
    expect(screen.getByRole("button", { name: "NOIR 1" })).toHaveAttribute("aria-current", "true");
    fireEvent.touchStart(region, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchMove(region, {
      touches: [
        { clientX: 100, clientY: 100 },
        { clientX: 110, clientY: 100 },
      ],
    });
    fireEvent.touchEnd(region, { changedTouches: [{ clientX: 100, clientY: 100 }] });
    expect(screen.getByRole("button", { name: "NOIR 1" })).toHaveAttribute("aria-current", "true");
  });
  it("resets selection and drag state when the supplied product images change", () => {
    const { rerender } = render(<ProductGallery images={images} alt="NOIR" sizes="100vw" />);
    fireEvent.click(screen.getByRole("button", { name: "NOIR 3" }));
    rerender(
      <ProductGallery
        images={["https://cdn/new.jpg", "https://cdn/new2.jpg"]}
        alt="OTHER"
        sizes="100vw"
      />,
    );
    expect(screen.getByAltText("OTHER")).toHaveAttribute("src", "https://cdn/new.jpg");
    expect(screen.getByRole("button", { name: "OTHER 1" })).toHaveAttribute("aria-current", "true");
  });
  it("offers bounded keyboard selection only on the main image viewport", () => {
    render(<ProductGallery images={images} alt="NOIR" sizes="100vw" />);
    const region = screen.getByRole("region", { name: "NOIR images" });
    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(screen.getByRole("button", { name: "NOIR 2" })).toHaveAttribute("aria-current", "true");
    fireEvent.keyDown(region, { key: "End" });
    expect(screen.getByRole("button", { name: "NOIR 3" })).toHaveAttribute("aria-current", "true");
  });
});

it("settles product media after the browser releases implicit touch capture", () => {
  render(<ProductGallery images={images} alt="NOIR" sizes="100vw" />);
  const region = screen.getByRole("region", { name: "NOIR images" });
  fireEvent.touchStart(region, { touches: [{ clientX: 300, clientY: 100 }] });
  fireEvent.touchMove(region, { touches: [{ clientX: 180, clientY: 100 }] });
  fireEvent.pointerUp(region, { pointerType: "touch", pointerId: 7 });
  fireEvent.lostPointerCapture(region, { pointerType: "touch", pointerId: 7 });
  fireEvent.touchEnd(region, { touches: [], changedTouches: [{ clientX: 180, clientY: 100 }] });
  expect(screen.getByRole("button", { name: "NOIR 2" })).toHaveAttribute("aria-current", "true");
  expect(screen.getByTestId("product-image-track")).toHaveStyle({
    transform: "translateX(calc(-100% + 0px))",
  });
});
