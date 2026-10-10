import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 代码级防回归(方案 §6.2 B12)。这些规则没有"某个组件"的归属,只能靠全仓扫描
 * 守住 —— 一条新写的 `text-[9px]` 或裸 `h-8 w-8` 会让前面所有移动端修复逐条失效,
 * 而单测永远发现不了。
 *
 * 断言的是**源码字面量**而不是运行结果:Tailwind 只扫字面量,拼出来的类名
 * 在生产构建里根本不会生成 CSS(方案 §2 E 特别提醒过这一点)。
 */

const SRC = join(process.cwd(), "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full) && !/\.test\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

/** 逐行扫描,返回 `file:line: 该行内容`(便于直接定位)。 */
function scan(pattern: RegExp): string[] {
  const hits: string[] = [];
  for (const file of walk(SRC)) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      // 注释里的反面例子不算违规(例如"不要写 px-6")
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      if (pattern.test(line))
        hits.push(`${relative(process.cwd(), file)}:${i + 1}: ${line.trim()}`);
    });
  }
  return hits;
}

describe("移动端规范 · 源码断言 (B12)", () => {
  it("不出现 9px / 10px 字号(11px 是站内绝对下限)", () => {
    expect(scan(/text-\[(9|10)px\]/)).toEqual([]);
  });

  it("不出现没有下限的 cqw 字号(窄屏会线性缩水到 7.91px 那一类)", () => {
    // 允许 `text-[max(11px,4.84cqw)]` / `text-[clamp(...)]`,禁止裸 `text-[4.84cqw]`
    expect(scan(/text-\[\d[\d.]*cqw\]/)).toEqual([]);
  });

  it("不出现裸 `py-3 -my-3`(min-h 对 inline-block 无效,命中区其实没变大)", () => {
    expect(scan(/-my-3[^\n]*py-3|py-3[^\n]*-my-3/)).toEqual([]);
  });

  it("页面根容器不再自带 max-w-*xl + px-*(两套边距并存)", () => {
    expect(scan(/max-w-\dx?l\s+px-\d/)).toEqual([]);
  });

  it("紧凑按钮尺寸(32/36px)只在 `lg:` 前缀里出现 —— 窄屏必须 ≥44px,≥1024px 保持不变", () => {
    // `lg:h-8 lg:w-8` 这类"桌面恢复"写法是允许的;裸的 h-8 w-8 不允许。
    expect(scan(/(?<!lg:)h-(8|9) w-(8|9)/)).toEqual([]);
  });
});
