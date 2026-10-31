import { describe, expect, it } from "vitest";
import { getProductHandleAlias, productHandleAliases } from "./index";

describe("商品 handle 重定向表", () => {
  it("未记录的 handle 返回 undefined(不会误跳转)", () => {
    expect(getProductHandleAlias("noir")).toBeUndefined();
    expect(getProductHandleAlias("offy_redrush")).toBeUndefined();
  });

  it("别名不能自指,也不能形成链", () => {
    for (const [from, to] of Object.entries(productHandleAliases)) {
      expect(from).not.toBe(to);
    }
  });
});
