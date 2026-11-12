import { expect, it } from "vitest";
import { buildMetaLink, metaUrlParameters } from "./links";
it("builds one source template without inventing a click ID or losing existing native parameters", () => {
  const link = buildMetaLink("/products/a?dt_id=123&utm_source=old", "https://isoffy.com");
  expect(link).toContain("https://isoffy.com/products/a?dt_id=123&");
  expect(link).toContain("campaign_id={{campaign.id}}");
  expect(link).toContain("adset_id={{adset.id}}");
  expect(link).not.toContain("utm_source=old");
  expect(metaUrlParameters).not.toContain("fbclid");
});
it("rejects foreign, administrative and normalized forbidden destinations", () => {
  for (const target of [
    "https://evil.example/products",
    "/shop/../admin",
    "/api/meta/events",
    "/checkout/return",
    "javascript:alert(1)",
  ])
    expect(() => buildMetaLink(target, "https://isoffy.com")).toThrow();
});
