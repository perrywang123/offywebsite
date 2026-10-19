import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteJsonLd } from "./SiteJsonLd";

const SITE = "https://isoffy.com";

describe("<SiteJsonLd>", () => {
  it("renders exactly Organization + WebSite, parsed from the real script tags", () => {
    const { container } = render(<SiteJsonLd siteUrl={SITE} />);
    const blocks = [...container.querySelectorAll('script[type="application/ld+json"]')].map(
      (script) => JSON.parse(script.textContent ?? "") as Record<string, unknown>,
    );

    expect(blocks.map((block) => block["@type"])).toEqual(["Organization", "WebSite"]);
    expect(blocks[0]).toMatchObject({
      name: "is.offy",
      url: SITE,
      logo: `${SITE}/assets/brand/is-offy-logo.png`,
      sameAs: ["https://www.instagram.com/is.offy"],
    });
    expect(blocks[1]).toMatchObject({ name: "is.offy", url: SITE });
  });

  it("adds no visible DOM", () => {
    const { container } = render(<SiteJsonLd siteUrl={SITE} />);
    expect(container.querySelectorAll(":scope > :not(script)")).toHaveLength(0);
  });
});
