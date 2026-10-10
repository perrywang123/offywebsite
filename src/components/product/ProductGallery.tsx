"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * PDP 主图 + 自图集缩略图(方案 §2 E「PDP 其实只有一张图」)。
 *
 * 数据层早已取回最多 10 张图(Shopify `images(first: 10)`),但详情页此前只渲染
 * `images[0]`,下方那条横滑条其实是**同系列其它款**(别商品)。这里把主图做成
 * 可切换的自图集:只有一张图时行为与改动前逐字一致(单图,不出现缩略图条)。
 *
 * 缩略图是**按钮**而不是链接 —— 它切的是同一件商品的不同图,不是导航目标,
 * 用 Link 会污染 history 与 SEO。
 */
export function ProductGallery({
  images,
  alt,
  sizes,
}: {
  images: string[];
  alt: string;
  sizes: string;
}) {
  const [requested, setRequested] = useState(0);
  const active = images[requested] ? requested : 0;
  const current = images[active];
  if (!current) return null;

  return (
    <>
      <div className="bg-cream-deep relative aspect-[4/5] overflow-hidden rounded-[calc(var(--radius-card)-8px)] md:aspect-[3/4]">
        <Image src={current} alt={alt} fill priority sizes={sizes} className="object-contain" />
      </div>

      {images.length > 1 && (
        // `.hscroll`:吸附 + 隐藏滚动条 + 窄屏两端渐隐(方案 #15)
        <div className="hscroll mt-3 gap-2.5 pb-2">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setRequested(i)}
              // 当前浏览项的状态矩阵照抄 redesign-02 §4.5(默认 sand / 当前 brown-600
              // + ring / 按下 brown-600)。`title` 对触屏无效,故用 aria-label 保证
              // 每颗缩略图都有可访问名。
              aria-current={i === active ? "true" : undefined}
              aria-label={`${alt} ${i + 1}`}
              className="rounded-soft border-sand hover:border-brown-500 aria-[current=true]:border-brown-600 aria-[current=true]:ring-brown-100 active:border-brown-600 relative h-20 w-14 shrink-0 overflow-hidden border transition-colors aria-[current=true]:ring-2"
            >
              <Image src={src} alt="" fill sizes="56px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
