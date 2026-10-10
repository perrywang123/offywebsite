import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Marquee } from "./Marquee";

describe("Marquee", () => {
  it("duplicates its content so the loop is seamless", () => {
    render(<Marquee>FREE SHIPPING OVER $150</Marquee>);
    expect(screen.getAllByText("FREE SHIPPING OVER $150")).toHaveLength(2);
  });

  it("falls back to a wrapped static block under prefers-reduced-motion (#13 / B10)", () => {
    render(<Marquee>FREE SHIPPING OVER $150</Marquee>);
    const [first, duplicate] = screen.getAllByText("FREE SHIPPING OVER $150");

    // 容器在 reduced-motion 下允许换行、居中(否则被 overflow-hidden 裁掉)
    const track = first.parentElement as HTMLElement;
    const container = track.parentElement as HTMLElement;
    expect(container.className).toContain("motion-reduce:whitespace-normal");
    expect(container.className).toContain("motion-reduce:text-center");
    // 为无缝循环而存在的第二份在 reduced-motion 下隐藏
    expect(duplicate.className).toContain("motion-reduce:hidden");
    expect(duplicate).toHaveAttribute("aria-hidden");
  });
});
