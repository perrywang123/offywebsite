// @vitest-environment node
import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import en from "../../../messages/en.json";
import { testDb } from "@/server/kol/test-db";
import { loadHomeContent, publishHomeContent } from "./store";
import { homeImageResponse, storeHomeImage } from "./media";

it("prefills the current hero, shared announcements and Latest without an existing row", () => {
  const { content, revision } = loadHomeContent(testDb());
  expect(revision).toBe(0);
  expect(content.hero).toHaveLength(5);
  expect(content.hero[0]).toMatchObject({
    image: "/assets/hero/hero-brand.jpg",
    href: "/about",
    enabled: true,
  });
  expect(content.announcements.map((item) => item.text)).toEqual(en.common.promoMessages);
  expect(content.latest.feature.href).toBe("/products/swan-princess");
  expect(content.latest.items).toHaveLength(4);
});

it("persists a whole edit and rejects outdated and invalid writes", async () => {
  const db = testDb();
  const edit = loadHomeContent(db);
  edit.content.hero[0].href = "/collections?campaign=holiday#featured";
  edit.content.announcements[0] = {
    text: "Holiday gifts",
    href: "https://example.com/holiday",
    enabled: true,
  };
  const saved = await publishHomeContent(db, edit, "admin-test");
  expect(saved).toEqual({ ...edit, revision: 1 });
  expect(loadHomeContent(db)).toEqual(saved);
  await expect(publishHomeContent(db, edit, "admin-test")).rejects.toThrow("homepage_changed");
  for (const href of [
    "javascript:alert(1)",
    "//example.com",
    "/\\example.com",
    "https://a@b.com",
  ]) {
    const invalid = structuredClone(saved);
    invalid.content.latest.feature.href = href;
    await expect(publishHomeContent(db, invalid, "admin-test")).rejects.toThrow();
  }
  expect(loadHomeContent(db)).toEqual(saved);
});

it("keeps staged images private until a valid publish and serves the persisted raster", async () => {
  const db = testDb();
  const original = readFileSync("public/assets/brand/is-offy-logo.png");
  const upload = await storeHomeImage(
    db,
    new Request("https://offy.test/upload", {
      method: "POST",
      body: new Uint8Array(original),
    }),
  );
  const id = upload.image.split("/").at(-1)!;
  expect(homeImageResponse(db, id).status).toBe(404);
  expect(homeImageResponse(db, id, true).headers.get("cache-control")).toContain("no-store");
  const edit = loadHomeContent(db);
  edit.content.hero[0].image = upload.image;
  edit.content.latest.feature.image = `/api/home-media/${"a".repeat(64)}`;
  await expect(publishHomeContent(db, edit, "admin-test")).rejects.toThrow(
    "homepage_image_missing",
  );
  expect(homeImageResponse(db, id).status).toBe(404);
  expect(loadHomeContent(db).revision).toBe(0);
  edit.content.latest.feature.image = upload.image;
  await publishHomeContent(db, edit, "admin-test");
  const response = homeImageResponse(db, id);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("image/webp");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(30);
  expect(loadHomeContent(db).content.hero[0].image).toBe(upload.image);
});

it("rejects oversized and invalid image payloads", async () => {
  const db = testDb();
  const upload = (body: BodyInit) =>
    storeHomeImage(db, new Request("https://offy.test/upload", { method: "POST", body }));
  await expect(upload("<svg xmlns='http://www.w3.org/2000/svg'/>")).rejects.toThrow(
    "homepage_image_invalid",
  );
  await expect(upload(new Uint8Array(1024 * 1024))).rejects.toThrow("homepage_image_too_large");
});

it("verifies a new Shopify preview, saving only the card choice", async () => {
  const db = testDb();
  const edit = loadHomeContent(db);
  Object.assign(edit.content.latest.items[0], {
    href: "/products/snow-white",
    comingSoon: true,
  });
  const read = vi.fn().mockResolvedValue({ releaseAt: "2099-11-30T12:00:00Z" });
  const saved = await publishHomeContent(db, edit, "admin-test", read);
  expect(read).toHaveBeenCalledExactlyOnceWith("snow-white");
  expect(saved).toEqual({ ...edit, revision: 1 });

  const changeBanner = structuredClone(saved);
  changeBanner.content.hero[0].href = "/collections";
  await expect(publishHomeContent(db, changeBanner, "admin-test", read)).resolves.toMatchObject({
    revision: 2,
  });
  expect(read).toHaveBeenCalledTimes(1);
});

it("requires a verified Shopify preview and permits an unannounced launch date", async () => {
  const db = testDb();
  const edit = loadHomeContent(db);
  Object.assign(edit.content.latest.feature, {
    href: "/products/merry-offy",
    comingSoon: true,
  });
  const read = vi
    .fn()
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({ releaseAt: null });
  await expect(publishHomeContent(db, edit, "admin-test", read)).rejects.toThrow(
    "homepage_launch_product_missing",
  );
  expect(loadHomeContent(db).revision).toBe(0);
  await expect(publishHomeContent(db, edit, "admin-test", read)).rejects.toThrow(
    "homepage_launch_not_configured",
  );
  expect(loadHomeContent(db).revision).toBe(0);
  const saved = await publishHomeContent(db, edit, "admin-test", read);
  expect(saved).toEqual({ ...edit, revision: 1 });
});

it("rejects off-site preview targets before consulting Shopify", async () => {
  const db = testDb();
  const edit = loadHomeContent(db);
  Object.assign(edit.content.latest.feature, {
    href: "https://example.com/products/snow-white",
    comingSoon: true,
  });
  const read = vi.fn();
  await expect(publishHomeContent(db, edit, "admin-test", read)).rejects.toThrow(
    "homepage_launch_link_invalid",
  );
  expect(read).not.toHaveBeenCalled();
  expect(loadHomeContent(db).revision).toBe(0);
});
