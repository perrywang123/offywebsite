// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { intl } = vi.hoisted(() => ({ intl: vi.fn(() => NextResponse.next()) }));
vi.mock("next-intl/middleware", () => ({ default: () => intl }));

import middleware from "./middleware";

describe("metadata icon routing", () => {
  beforeEach(() => intl.mockClear());

  it("leaves the generated icon at the root instead of rewriting to /en/icon", () => {
    const response = middleware(new NextRequest("https://isoffy.com/icon?asset-version"));
    expect(intl).not.toHaveBeenCalled();
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("still applies locale routing to storefront pages", () => {
    middleware(new NextRequest("https://isoffy.com/products"));
    expect(intl).toHaveBeenCalledOnce();
  });
});
