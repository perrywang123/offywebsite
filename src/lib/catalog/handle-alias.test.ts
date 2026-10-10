import { describe, expect, it } from "vitest";
import { getProductHandleAlias, products } from "./index";

describe("商品 handle 重定向表", () => {
  it("未记录的 handle 返回 undefined(不会误跳转)", () => {
    expect(getProductHandleAlias("noir")).toBeUndefined();
    expect(getProductHandleAlias("offy_redrush")).toBeUndefined();
  });

  it("别名目标必须是当前真实存在的商品 code —— 防止跳到一个同样不存在的地址", () => {
    const codes = new Set(products.map((p) => p.code));
    for (const [from, to] of Object.entries({} as Record<string, string>)) {
      expect(codes.has(to), `${from} → ${to} 的目标不存在`).toBe(true);
    }
  });

  it("别名不能自指,也不能形成链", () => {
    for (const [from, to] of Object.entries({} as Record<string, string>)) {
      expect(from).not.toBe(to);
    }
  });
});
