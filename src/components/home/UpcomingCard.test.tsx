import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UpcomingCard } from "./UpcomingCard";

const ip = {
  code: "MISS-KITTY",
  name: { zh: "凯蒂小姐", en: "Miss Kitty" },
  tagline: { zh: "傲娇但心软", en: "A spoiled princess with a tender heart." },
  image: "/assets/home/upcoming-kitty.png",
};

const renderCard = (locale: string, overrides: Partial<typeof ip> = {}) =>
  render(
    <UpcomingCard ip={{ ...ip, ...overrides }} inDevelopmentLabel="IN DEVELOPMENT" locale={locale} />,
  );

describe("UpcomingCard (后续计划.psd: 插画卡 + IN DEVELOPMENT 胶囊 + 名字 + 居中标语)", () => {
  it("渲染 en 的名字、标语与状态胶囊", () => {
    renderCard("en");
    expect(screen.getByRole("heading", { name: "Miss Kitty" })).toBeInTheDocument();
    expect(screen.getByText("A spoiled princess with a tender heart.")).toBeInTheDocument();
    expect(screen.getByText("IN DEVELOPMENT")).toBeInTheDocument();
  });

  it("zh 走中文文案", () => {
    renderCard("zh");
    expect(screen.getByRole("heading", { name: "凯蒂小姐" })).toBeInTheDocument();
    expect(screen.getByText("傲娇但心软")).toBeInTheDocument();
  });

  it("渲染角色插画(新 PSD 里角色形象已公开,不再是纯点阵占位)", () => {
    const { container } = renderCard("en");
    const imgs = container.querySelectorAll("img");
    expect(imgs).toHaveLength(1);
    expect(imgs[0].getAttribute("src")).toContain("upcoming-kitty.png");
  });

  it("不再出现旧版的 COMING SOON — TBD(新 PSD 没有这一层)", () => {
    renderCard("en");
    expect(screen.queryByText(/COMING SOON/i)).not.toBeInTheDocument();
  });
});
