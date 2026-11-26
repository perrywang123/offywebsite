import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { defaultHomeContent, type HomeContentVersion } from "@/lib/home-content";
import { HomeContentEditor } from "./HomeContentEditor";

it("adds, removes and publishes hero images while retaining their own settings", async () => {
  const initial = { revision: 1, content: defaultHomeContent() };
  const request = vi.fn(async (_path: string, body?: unknown) =>
    body ? { ...(body as HomeContentVersion), revision: 2 } : initial,
  );
  render(
    <HomeContentEditor siteUrl="https://offy.test" request={request} onSessionExpired={vi.fn()} />,
  );
  fireEvent.click(await screen.findByRole("button", { name: "新增轮播图" }));
  const added = within(screen.getByRole("region", { name: "轮播图 6" }));
  const save = screen.getByRole("button", { name: "保存并发布" });
  fireEvent.click(save);
  expect(screen.getByRole("alert")).toHaveTextContent(/首屏轮播.*6.*请上传图片/);
  expect(request).toHaveBeenCalledTimes(1);
  fireEvent.change(added.getByLabelText("图片地址"), {
    target: { value: "/assets/hero/new-campaign.jpg" },
  });
  fireEvent.change(added.getByLabelText("图片说明"), { target: { value: "New campaign" } });
  fireEvent.change(added.getByLabelText("跳转链接（选填）"), {
    target: { value: "/about?campaign=new" },
  });
  fireEvent.click(screen.getByRole("button", { name: "删除品牌主图" }));
  expect(screen.queryByRole("region", { name: "品牌主图" })).toBeNull();
  expect(
    within(screen.getByRole("region", { name: "促销主图" })).getByLabelText("活动标题"),
  ).toHaveValue(initial.content.promotion.title);
  expect(
    within(screen.getByRole("region", { name: "轮播图 5" })).getByLabelText("图片说明"),
  ).toHaveValue("New campaign");
  expect(request).toHaveBeenCalledTimes(1);

  fireEvent.click(save);
  await screen.findByText("已发布，刷新首页即可查看。");
  const sent = request.mock.calls[1][1] as HomeContentVersion;
  expect(sent.content.hero.slice(0, 4)).toEqual(initial.content.hero.slice(1));
  expect(sent.content.hero[4]).toMatchObject({
    image: "/assets/hero/new-campaign.jpg",
    alt: "New campaign",
    href: "/about?campaign=new",
    enabled: true,
  });
  expect(sent.content.latest).toEqual(initial.content.latest);
});

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
