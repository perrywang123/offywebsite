import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import source from "../../../../docs/design/about-story/source-copy.json";

vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const { default: messages } = await import("../../../../messages/en.json");
  return {
    getTranslations: async (namespace: string) =>
      createTranslator({ locale: "en", messages, namespace: namespace as keyof typeof messages }),
  };
});

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import AboutPage, { generateMetadata } from "./page";
const params = Promise.resolve({ locale: "en" });

describe("PSD About invitation", () => {
  it("renders the four supplied manifesto paragraphs as selectable text", async () => {
    const { container } = render(await AboutPage({ params }));
    expect(screen.getByRole("heading", { level: 1, name: source.about.title })).toBeInTheDocument();
    for (const p of source.about.paragraphs) expect(screen.getByText(p)).toBeInTheDocument();
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.querySelector("main")).toBeNull();
  });

  it("pairs original character and creator images before the single story CTA", async () => {
    const { container } = render(await AboutPage({ params }));
    const images = [...container.querySelectorAll("img")];
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute("alt", expect.stringContaining("OFFY"));
    expect(images[1]).toHaveAttribute("alt", expect.stringContaining("Gia"));
    expect(
      images.every(
        (x) => Number(x.getAttribute("width")) > 0 && Number(x.getAttribute("height")) > 0,
      ),
    ).toBe(true);
    const link = screen.getByRole("link", { name: "EXPLORE OUR STORY" });
    expect(link).toHaveAttribute("href", "/our-story");
    expect(images[1].compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText("NEW IPS AHEAD")).toBeNull();
    expect(screen.queryByText("Custom & Collab")).toBeNull();
    expect(screen.queryByText(/XXXX/)).toBeNull();
  });

  it("advertises its own canonical and About metadata", async () => {
    const meta = await generateMetadata({ params });
    expect(meta.title).toBe("About Us");
    expect(meta.alternates?.canonical).toBe("/about");
    expect(meta.openGraph).toMatchObject({ title: "About Us", url: "/about" });
  });
});
