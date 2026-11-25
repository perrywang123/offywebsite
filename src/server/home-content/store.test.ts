// @vitest-environment node
import { expect, it } from "vitest";
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

it("persists a whole edit and rejects outdated and invalid writes", () => {
  const db = testDb();
  const edit = loadHomeContent(db);
  edit.content.hero[0].href = "/collections?campaign=holiday#featured";
  edit.content.announcements[0] = {
    text: "Holiday gifts",
    href: "https://example.com/holiday",
    enabled: true,
  };
  const saved = publishHomeContent(db, edit, "admin-test");
  expect(saved).toEqual({ ...edit, revision: 1 });
  expect(loadHomeContent(db)).toEqual(saved);
  expect(() => publishHomeContent(db, edit, "admin-test")).toThrow("homepage_changed");
  for (const href of [
    "javascript:alert(1)",
    "//example.com",
    "/\\example.com",
    "https://a@b.com",
  ]) {
    const invalid = structuredClone(saved);
    invalid.content.latest.feature.href = href;
    expect(() => publishHomeContent(db, invalid, "admin-test")).toThrow();
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
  expect(() => publishHomeContent(db, edit, "admin-test")).toThrow("homepage_image_missing");
  expect(homeImageResponse(db, id).status).toBe(404);
  expect(loadHomeContent(db).revision).toBe(0);
  edit.content.latest.feature.image = upload.image;
  publishHomeContent(db, edit, "admin-test");
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
