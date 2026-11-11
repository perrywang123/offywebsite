import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CartButton } from "./CartButton";

const cart = vi.hoisted(() => ({ count: 0, open: vi.fn() }));
vi.mock("./CartProvider", () => ({ useCart: () => cart }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

describe("CartButton", () => {
  it.each([0, 128])("keeps the real count %i and existing bag-open action", (count) => {
    cart.count = count;
    cart.open.mockClear();
    render(<CartButton />);
    const button = screen.getByRole("button", { name: "cart.openAria" });
    expect(button).toHaveTextContent(String(count));
    fireEvent.click(button);
    expect(cart.open).toHaveBeenCalledOnce();
  });
});
