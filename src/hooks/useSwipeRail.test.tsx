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
