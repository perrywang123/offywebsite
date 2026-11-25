import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { defaultHomeContent, type HomeContentVersion } from "@/lib/home-content";
import { HomeContentEditor } from "./HomeContentEditor";

async function openLatestEditor(request: (path: string, body?: unknown) => Promise<unknown>) {
  render(
    <HomeContentEditor siteUrl="https://offy.test" request={request} onSessionExpired={vi.fn()} />,
  );
  fireEvent.click(await screen.findByRole("button", { name: "The Latest from OFFY" }));
  return {
    feature: within(screen.getByRole("region", { name: "主卡" })),
    secondary: within(screen.getByRole("region", { name: "动态卡 1" })),
    save: screen.getByRole("button", { name: "保存并发布" }),
  };
}

it("configures main and secondary previews with only Shopify-sourced release metadata", async () => {
  const request = vi.fn(async (_path: string, body?: unknown) => {
    if (!body) return { revision: 1, content: defaultHomeContent() };
    const { content } = body as HomeContentVersion;
    return { revision: 2, content };
  });
  const { feature, secondary, save } = await openLatestEditor(request);

  const featureToggle = feature.getByRole("checkbox", { name: "Coming Soon" });
  expect(featureToggle).not.toBeChecked();
  expect(featureToggle).toHaveAccessibleDescription(
    /Coming soon.*Release date.*保存时核对 Shopify/,
  );
  expect(feature.queryByLabelText(/发售时间/)).not.toBeInTheDocument();
  expect(feature.getByLabelText("跳转链接")).toHaveValue("/products/swan-princess");

  fireEvent.click(featureToggle);
  fireEvent.change(feature.getByLabelText("站内商品链接"), {
    target: { value: "/products/snow-white" },
  });
  fireEvent.click(secondary.getByRole("checkbox", { name: "Coming Soon" }));
  fireEvent.change(secondary.getByLabelText("站内商品链接"), {
    target: { value: "/products/merry-offy" },
  });
  expect(feature.queryByLabelText(/发售时间/)).not.toBeInTheDocument();
  expect(secondary.queryByLabelText(/发售时间/)).not.toBeInTheDocument();

  fireEvent.click(save);
  await screen.findByText("已发布，刷新首页即可查看。");
  const sent = request.mock.calls[1][1] as HomeContentVersion;
  expect(sent.revision).toBe(1);
  expect(sent.content.latest.feature).toMatchObject({
    comingSoon: true,
    href: "/products/snow-white",
  });
  expect(sent.content.latest.feature).not.toHaveProperty("releaseAt");
  expect(sent.content.latest.items[0]).toMatchObject({
    comingSoon: true,
    href: "/products/merry-offy",
  });
  expect(sent.content.latest.items[0]).not.toHaveProperty("releaseAt");
  expect(sent.content).not.toHaveProperty("launches");
  expect(featureToggle).toBeChecked();
  expect(secondary.getByRole("checkbox", { name: "Coming Soon" })).toBeChecked();
  expect(save).toBeDisabled();
});

it.each([
  ["homepage_launch_product_missing", /Shopify 中找不到/],
  ["homepage_launch_unavailable", /暂时无法核对 Shopify/],
  ["homepage_launch_link_invalid", /站内商品链接/],
  ["homepage_launch_not_configured", /Shopify.*Coming soon.*未开启/],
])("explains %s and keeps the draft editable", async (code, message) => {
  const request = vi.fn(async (_path: string, body?: unknown) => {
    if (!body) return { revision: 1, content: defaultHomeContent() };
    throw Object.assign(new Error(code), { status: 400 });
  });
  const { feature, save } = await openLatestEditor(request);
  fireEvent.click(feature.getByRole("checkbox", { name: "Coming Soon" }));
  fireEvent.click(save);

  expect(await screen.findByRole("alert")).toHaveTextContent(message);
  expect(feature.getByRole("checkbox", { name: "Coming Soon" })).toBeChecked();
  await waitFor(() => expect(save).toBeEnabled());
});
