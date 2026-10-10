import { render, screen } from "@testing-library/react";
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
    expect(container.querySelectorAll("img")).toHaveLength(4);
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
