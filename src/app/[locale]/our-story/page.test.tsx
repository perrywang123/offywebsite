import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import source from "../../../../docs/design/about-story/source-copy.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
import StoryPage, { generateMetadata } from "./page";
const params = Promise.resolve({ locale: "en" });

describe("complete PSD OFFY story", () => {
  it("preserves every supplied narrative paragraph in the original chapter order", async () => {
    const { container } = render(await StoryPage({ params }));
    expect(screen.getByRole("heading", { level: 1, name: source.story.title })).toBeInTheDocument();
    const headings = [...container.querySelectorAll("h2")].map((x) => x.textContent);
    expect(headings).toEqual([
      source.story.creatorTitle,
      source.story.worldTitle,
      source.story.reflectionTitle,
      source.story.collectionTitle,
    ]);
    const paragraphs = [
      source.story.creatorIntro,
      ...source.story.creatorParagraphs,
      ...source.story.quoteParagraphs,
      ...source.story.originParagraphs,
      ...source.story.islandParagraphs,
      ...source.story.reflections.flatMap((r) => r.paragraphs),
      source.story.copyright,
      source.story.rights,
    ];
    for (const p of paragraphs) expect(screen.getByText(p)).toBeInTheDocument();
    expect(container.querySelectorAll("blockquote")).toHaveLength(1);
    expect(container.querySelector("main")).toBeNull();
    expect(container.querySelector(".reveal")).toBeNull();
    expect(container.textContent).not.toContain("vdon't");
  });

  it("offers deterministic return links and original artwork without fake product actions", async () => {
    const { container } = render(await StoryPage({ params }));
    const links = screen.getAllByRole("link", { name: "Back to About" });
    expect(links).toHaveLength(2);
    for (const link of links) expect(link).toHaveAttribute("href", "/about");
    expect(container.querySelectorAll("[data-story-sketch]")).toHaveLength(4);
    expect(container.querySelectorAll("[data-collection-look]")).toHaveLength(25);
    expect(screen.queryByRole("button", { name: /buy|cart|bag/i })).toBeNull();
    expect(screen.getByRole("img", { name: /Gia/ })).toBeInTheDocument();
  });

  it("defines story-specific canonical and sharing metadata", async () => {
    const meta = await generateMetadata({ params });
    expect(meta.alternates?.canonical).toBe("/our-story");
    expect(meta.title).toBe("The Story of OFFY");
    expect(meta.openGraph).toMatchObject({ title: "The Story of OFFY", url: "/our-story" });
  });
});
