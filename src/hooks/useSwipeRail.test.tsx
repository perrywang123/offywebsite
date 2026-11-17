import { act, createEvent, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSwipeRail } from "./useSwipeRail";

function Rail() {
  const rail = useSwipeRail(3);
  return (
    <>
      <div ref={rail.viewportRef} data-testid="viewport" {...rail.handlers}>
        <div ref={rail.trackRef} data-testid="rail" style={rail.trackStyle}>
          <a href="#products">Open</a>
        </div>
      </div>
      <output>
        {rail.active}:{String(rail.gestureActive)}
      </output>
    </>
  );
}
const touch = (x: number, y = 100) => ({ clientX: x, clientY: y });
const mouse = { pointerType: "mouse", pointerId: 1, isPrimary: true, button: 0 };

describe("useSwipeRail boundaries", () => {
  it("ignores secondary mouse input and other pointer contacts", () => {
    render(<Rail />);
    const viewport = screen.getByTestId("viewport");
    fireEvent.pointerDown(viewport, { ...mouse, button: 2, clientX: 300, clientY: 100 });
    fireEvent.pointerMove(viewport, { ...mouse, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(viewport, { ...mouse, clientX: 100, clientY: 100 });
    expect(screen.getByRole("status")).toHaveTextContent("0:false");
    fireEvent.pointerDown(viewport, { ...mouse, clientX: 300, clientY: 100 });
    fireEvent.pointerMove(viewport, { ...mouse, pointerId: 2, clientX: 50, clientY: 100 });
    expect(screen.getByTestId("rail")).toHaveStyle({ transform: "translateX(calc(0% + 0px))" });
    fireEvent.pointerCancel(viewport, mouse);
    expect(screen.getByRole("status")).toHaveTextContent("0:false");
  });

  it("abandons the gesture on lost capture or window blur", () => {
    render(<Rail />);
    const viewport = screen.getByTestId("viewport");
    fireEvent.pointerDown(viewport, { ...mouse, clientX: 300, clientY: 100 });
    fireEvent.pointerMove(viewport, { ...mouse, clientX: 100, clientY: 100 });
    fireEvent.lostPointerCapture(viewport, mouse);
    expect(screen.getByRole("status")).toHaveTextContent("0:false");
    fireEvent.touchStart(viewport, { touches: [touch(300)] });
    fireEvent.touchMove(viewport, { touches: [touch(100)] });
    act(() => window.dispatchEvent(new Event("blur")));
    fireEvent.touchEnd(viewport, { changedTouches: [touch(100)] });
    expect(screen.getByRole("status")).toHaveTextContent("0:false");
  });

  it("releases vertical intent immediately before contact ends outside the viewport", () => {
    render(<Rail />);
    const viewport = screen.getByTestId("viewport");
    fireEvent.pointerDown(viewport, { ...mouse, clientX: 300, clientY: 100 });
    fireEvent.pointerMove(viewport, { ...mouse, clientX: 295, clientY: 180 });
    expect(screen.getByRole("status")).toHaveTextContent("0:false");
    fireEvent.pointerUp(window, { ...mouse, clientX: 295, clientY: 800 });
    expect(screen.getByRole("status")).toHaveTextContent("0:false");
  });

  it("abandons a pending pointer when it is released outside the viewport", () => {
    render(<Rail />);
    const viewport = screen.getByTestId("viewport");
    fireEvent.pointerDown(viewport, { ...mouse, clientX: 300, clientY: 100 });
    fireEvent.pointerUp(window, { ...mouse, clientX: 300, clientY: 100 });
    expect(screen.getByRole("status")).toHaveTextContent("0:false");
  });

  it("never treats a small drag held still before release as a flick", () => {
    let time = 0;
    const clock = vi.spyOn(performance, "now").mockImplementation(() => time);
    try {
      render(<Rail />);
      const viewport = screen.getByTestId("viewport");
      fireEvent.touchStart(viewport, { touches: [touch(300)] });
      time = 20;
      fireEvent.touchMove(viewport, { touches: [touch(270)] });
      time = 500;
      fireEvent.touchEnd(viewport, { changedTouches: [touch(270)] });
      expect(screen.getByRole("status")).toHaveTextContent("0:false");
    } finally {
      clock.mockRestore();
    }
  });

  it("caps long drags to one viewport and advances only one panel", () => {
    render(<Rail />);
    const viewport = screen.getByTestId("viewport");
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({ width: 400 } as DOMRect);
    fireEvent.touchStart(viewport, { touches: [touch(300)] });
    fireEvent.touchMove(viewport, { touches: [touch(-1700)] });
    expect(screen.getByTestId("rail")).toHaveStyle({ transform: "translateX(calc(0% + -400px))" });
    fireEvent.touchEnd(viewport, { changedTouches: [touch(-1700)] });
    expect(screen.getByRole("status")).toHaveTextContent("1:false");
  });

  it("does not jump a running CSS settle to its logical target on renewed contact", () => {
    render(<Rail />);
    const viewport = screen.getByTestId("viewport");
    const track = screen.getByTestId("rail");
    Object.defineProperty(track, "getAnimations", { value: () => [{ playState: "running" }] });
    fireEvent.touchStart(viewport, { touches: [touch(300)] });
    fireEvent.touchMove(viewport, { touches: [touch(100)] });
    fireEvent.touchEnd(viewport, { changedTouches: [touch(100)] });
    expect(screen.getByRole("status")).toHaveTextContent("0:false");
    const click = createEvent.click(screen.getByRole("link"), {
      detail: 1,
      bubbles: true,
      cancelable: true,
    });
    fireEvent(screen.getByRole("link"), click);
    expect(click.defaultPrevented).toBe(true);
    const keyboard = createEvent.click(screen.getByRole("link"), {
      detail: 0,
      bubbles: true,
      cancelable: true,
    });
    fireEvent(screen.getByRole("link"), keyboard);
    expect(keyboard.defaultPrevented).toBe(false);
  });
});

describe("touch and pointer event interleaving", () => {
  const compatibilityPointer = { pointerType: "touch", pointerId: 7, isPrimary: true };
  const finger = (x: number) => ({ identifier: 7, clientX: x, clientY: 100 });

  it("keeps a touch gesture alive when implicit pointer capture is lost before touchend", () => {
    let time = 0;
    const clock = vi.spyOn(performance, "now").mockImplementation(() => time);
    try {
      render(<Rail />);
      const viewport = screen.getByTestId("viewport");
      vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({ width: 390 } as DOMRect);
      fireEvent.pointerDown(viewport, { ...compatibilityPointer, clientX: 300, clientY: 100 });
      fireEvent.touchStart(viewport, { touches: [finger(300)] });
      time = 1000;
      fireEvent.touchMove(viewport, { touches: [finger(180)] });
      fireEvent.pointerUp(viewport, { ...compatibilityPointer, clientX: 180, clientY: 100 });
      fireEvent.lostPointerCapture(viewport, compatibilityPointer);
      expect(screen.getByRole("status")).toHaveTextContent("0:true");
      time = 1300;
      fireEvent.touchEnd(viewport, { touches: [], changedTouches: [finger(180)] });
      expect(screen.getByRole("status")).toHaveTextContent("1:false");
      expect(screen.getByTestId("rail")).toHaveStyle({
        transform: "translateX(calc(-100% + 0px))",
      });
    } finally {
      clock.mockRestore();
    }
  });

  it("does not let a different pointer cancel the owning mouse/pen drag", () => {
    render(<Rail />);
    const viewport = screen.getByTestId("viewport");
    fireEvent.pointerDown(viewport, { ...mouse, clientX: 300, clientY: 100 });
    fireEvent.pointerMove(viewport, { ...mouse, clientX: 180, clientY: 100 });
    fireEvent.lostPointerCapture(viewport, { ...mouse, pointerId: 99 });
    fireEvent.pointerCancel(viewport, { ...mouse, pointerId: 99 });
    expect(screen.getByRole("status")).toHaveTextContent("0:true");
    fireEvent.pointerUp(viewport, { ...mouse, clientX: 180, clientY: 100 });
    expect(screen.getByRole("status")).toHaveTextContent("1:false");
  });

  it("retains short fast touch velocity through pointer capture release and supports the next swipe", () => {
    let time = 0;
    const clock = vi.spyOn(performance, "now").mockImplementation(() => time);
    try {
      render(<Rail />);
      const viewport = screen.getByTestId("viewport");
      vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({ width: 390 } as DOMRect);
      fireEvent.touchStart(viewport, { touches: [finger(300)] });
      time = 30;
      fireEvent.touchMove(viewport, { touches: [finger(270)] });
      fireEvent.lostPointerCapture(viewport, compatibilityPointer);
      time = 40;
      fireEvent.touchEnd(viewport, { touches: [], changedTouches: [finger(270)] });
      expect(screen.getByRole("status")).toHaveTextContent("1:false");
      time = 1000;
      fireEvent.touchStart(viewport, { touches: [finger(300)] });
      time = 1500;
      fireEvent.touchMove(viewport, { touches: [finger(170)] });
      fireEvent.pointerUp(window, compatibilityPointer);
      fireEvent.lostPointerCapture(viewport, compatibilityPointer);
      fireEvent.touchEnd(viewport, { touches: [], changedTouches: [finger(170)] });
      expect(screen.getByRole("status")).toHaveTextContent("2:false");
    } finally {
      clock.mockRestore();
    }
  });
});
