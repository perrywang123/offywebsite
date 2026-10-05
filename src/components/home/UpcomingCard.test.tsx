import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UpcomingCard } from "./UpcomingCard";

const ip = {
  code: "MISS-KITTY",
  name: { zh: "凯蒂小姐", en: "Miss Kitty" },
  tagline: { zh: "傲娇但心软", en: "A spoiled princess with a tender heart." },
};

describe("UpcomingCard (PSD dotted placeholder card, live bilingual text)", () => {
  it("renders the en name/tagline inside the card with badge and COMING SOON — TBD label", () => {
    render(
      <UpcomingCard
        ip={ip}
        inDevelopmentLabel="IN DEVELOPMENT"
        comingSoonLabel="COMING SOON — TBD"
        locale="en"
      />,
    );
    expect(screen.getByRole("heading", { name: "Miss Kitty" })).toBeInTheDocument();
    expect(screen.getByText("A spoiled princess with a tender heart.")).toBeInTheDocument();
    expect(screen.getByText("IN DEVELOPMENT")).toBeInTheDocument();
    expect(screen.getByText("COMING SOON — TBD")).toBeInTheDocument();
  });

  it("localizes name and tagline for zh", () => {
    render(
      <UpcomingCard
        ip={ip}
        inDevelopmentLabel="IN DEVELOPMENT"
        comingSoonLabel="COMING SOON — TBD"
        locale="zh"
      />,
    );
    expect(screen.getByRole("heading", { name: "凯蒂小姐" })).toBeInTheDocument();
    expect(screen.getByText("傲娇但心软")).toBeInTheDocument();
  });

  it("renders no product/art image — the card is a CSS dotted placeholder per the PSD", () => {
    const { container } = render(
      <UpcomingCard
        ip={ip}
        inDevelopmentLabel="IN DEVELOPMENT"
        comingSoonLabel="COMING SOON — TBD"
        locale="en"
      />,
    );
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(container.firstChild).toHaveClass("media-placeholder");
  });
});
