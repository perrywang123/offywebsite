import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";
import { heroSlides } from "./content";
import { seriesList } from "./catalog/series";

/**
 * 「系列 ↔ 配图」映射守卫(2026-10-13)。
 *
 * 背景:系列配图曾整体错位 —— 同一个映射分散在三处(首页头图 `heroSlides`、
 * 系列汇总页 `collections/page.tsx` 的 `SERIES_HERO_IMAGE`、系列商品页
 * `seriesList[].heroImage`),而 `hero-streetwear.jpg` / `hero-playful.jpg`
 * 两个**文件名与图内容相反**,于是户外/街头系列显示裙子那组、
 * 趣味(Dress-up)系列显示运动那组。
 *
 * 文件名已按图内容改正(逐张打开图片人工核对 + 底边色实测双证),这里把结论钉住:
 *  1. 文件名即内容 —— 每个系列引用的文件名必须与 `SERIES_FILE` 一致;
 *  2. 引用的图必须真的存在 —— 改名漏改一处就会红,而不是线上悄悄给个 404 图;
 *  3. series.ts 用的是编号图(hero-0N.jpg),编号本身不含任何信息,所以把
 *     「编号 → 内容」写死在这里,以后谁再凭编号顺序猜,这条断言会拦住。
 */
const SERIES_FILE: Record<string, string> = {
  "princess-lady": "hero-princess.jpg", // 白底人台、公主组
  "outdoor-sporty": "hero-streetwear.jpg", // 运动/护目镜/球衣组(Streetwear)
  "playful-life": "hero-dressup.jpg", // 连衣裙/背带裤/深灰地面组(Dress-up)
};

/** 编号头图的图内容(hero-02/03/04 是上表三张头图的低分辨率版本,画面同源)。 */
const NUMBERED_HERO_CONTENT: Record<string, string> = {
  "/assets/hero/hero-02.jpg": "hero-princess.jpg",
  "/assets/hero/hero-03.jpg": "hero-streetwear.jpg",
  "/assets/hero/hero-04.jpg": "hero-dressup.jpg",
};

const publicFile = (url: string) => join(process.cwd(), "public", url.replace(/^\//, ""));

describe("series ↔ hero image mapping", () => {
  it("首页头图:每个系列屏用本系列自己的图,且文件名与图内容一致", () => {
    const seriesSlides = heroSlides.filter((s) => s.href?.startsWith("/collections/"));
    expect(seriesSlides.map((s) => s.href)).toEqual([
      "/collections/princess-lady",
      "/collections/outdoor-sporty",
      "/collections/playful-life",
    ]);
    for (const slide of seriesSlides) {
      const slug = slide.href!.replace("/collections/", "");
      expect(basename(slide.image)).toBe(SERIES_FILE[slug]);
    }
  });

  it("系列商品页:heroImage 指向该系列内容的图(编号图按内容表换算)", () => {
    for (const series of seriesList) {
      const content = NUMBERED_HERO_CONTENT[series.heroImage] ?? basename(series.heroImage);
      expect(content, `${series.slug} 的 heroImage`).toBe(SERIES_FILE[series.slug]);
    }
  });

  it("所有被引用的头图都真实存在(改名后不留死链)", () => {
    const referenced = [...heroSlides.map((s) => s.image), ...seriesList.map((s) => s.heroImage)];
    for (const url of new Set(referenced)) {
      expect(existsSync(publicFile(url)), `${url} 不存在`).toBe(true);
    }
  });
});
