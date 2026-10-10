import Image from "next/image";
import type { UpcomingIp } from "@/lib/catalog";

/**
 * 首页「后续计划」卡片 —— 按 后续计划.psd 还原(单卡 1448×812,≈1.783:1)。
 *
 * PSD 图层 → 结构(括号内为相对卡片的百分比,按 1448×812 换算):
 *   矩形 1 / 矩形 1 拷贝  → 卡片本体(圆角 + overflow 裁切)
 *   图层 13 拷贝 4/5      → 点阵底:底色 #e7e7e7,点距 43px = 卡宽 2.97%(≈18px @600px 卡宽)
 *   矢量智能对象          → 角色插画 x33.0% y-5.3% 宽72.1%(上下都溢出卡片,靠 overflow 裁)
 *   矩形 2 / 矩形 2 拷贝  → IN DEVELOPMENT 胶囊 x6.9% y37.8% 宽32.9% 高6.5%,#424242
 *   名字                  → 89.9px(=卡宽 6.21%)x6.2% y49.6%,居中块、大写字
 *   标语                  → 31.2px(=卡宽 2.15%)x9.3% y63.9% 宽28.0%,居中两行,#424242
 *
 * 与旧版(主 PSD 的「点阵占位盒」)的差异:
 *   · 角色形象在 PSD 里已经公开 → 换成智能对象导出的插画,不再是纯点阵占位
 *   · 去掉右侧「COMING SOON — TBD」(新 PSD 没有这一层)
 *   · 名字/标语改为居中,并拉开字号层次(名字远大标语)
 */
export function UpcomingCard({
  ip,
  inDevelopmentLabel,
  locale,
}: {
  ip: UpcomingIp;
  inDevelopmentLabel: string;
  locale: string;
}) {
  const name = locale === "zh" ? ip.name.zh : ip.name.en;
  const tagline = locale === "zh" ? ip.tagline.zh : ip.tagline.en;

  return (
    <div
      className="rounded-block relative aspect-[4/3] overflow-hidden sm:aspect-[1448/812]"
      // container-type: size(不是 inline-size)—— 纵向间距需要 cqh,而 cqh 只在
      // size 容器里可用。卡片尺寸由 aspect-ratio + 栅格宽度完全决定,contain: size 安全。
      // 点距用固定 px 而不是 cqw:元素自身是容器,自身样式里的 cqw 会解析到外层容器。
      style={{
        containerType: "size",
        backgroundColor: "#e7e7e7",
        backgroundImage: "radial-gradient(rgba(0,0,0,0.10) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
      }}
    >
      {/* 角色插画:右侧、上下都溢出卡片,由卡片 overflow-hidden 裁切(PSD 同款构图)。
          PSD 宽 1044/1448=72.1%,高 1182/812=145.6% —— 保持等比,h-auto 即得。
          窄屏(<640px)卡片变成 4:3,插画 72.1% 会盖住左上角的文字块(实测文字压插画),
          所以窄屏改成贴右、宽 58%;sm 起恢复 PSD 原值。 */}
      <Image
        src={ip.image}
        alt=""
        width={980}
        height={1108}
        sizes="(max-width: 640px) 58vw, 33vw"
        className="pointer-events-none absolute top-[-5.3%] right-0 left-auto h-auto w-[58%] max-w-none sm:right-auto sm:left-[33%] sm:w-[72.1%]"
      />

      {/* 文字块:整体起于 PSD 胶囊的 y(37.8%),内部间距按 PSD 元素间距换算成
          相对宽度的百分比(margin 的百分比在 CSS 里按**宽度**解析)。 */}
      <div className="absolute inset-x-0 top-[37.8%] flex flex-col items-start pl-[6.5%]">
        <span className="inline-flex h-[6.5cqh] min-h-[20px] w-[35.2%] items-center justify-center rounded-full bg-[#424242] text-[clamp(11px,2.40cqw,35px)] leading-none font-normal tracking-[var(--tracking-14)] text-white uppercase">
          {inDevelopmentLabel}
        </span>
        {/* 名字:PSD 里 Butterfly Sprite 折成两行,块宽 511/1448=35.3% 时 Miss Kitty
            仍是单行 —— 用 max-width 复现两种断行,不写死 "\n"。 */}
        <h3 className="font-display text-ink mt-[3.7cqh] max-w-[37.8%] text-center text-[clamp(24px,6.21cqw,90px)] leading-[1.02] font-medium tracking-tight uppercase">
          {name}
        </h3>
        {/* 三处 clamp 下限抬到 11/24/12px(方案 #7/#48/#49、§1.1 规则 1)。
            标语窄屏限宽 46%,避免横跨到右侧插画上(sm 起恢复 PSD 的 w-fit)。 */}
        <p className="mt-[3.7cqh] w-fit max-w-[46%] text-center text-[clamp(12px,2.15cqw,31px)] leading-[1.2] tracking-[var(--tracking-10)] whitespace-pre-line text-[#424242] uppercase sm:max-w-none">
          {tagline}
        </p>
      </div>
    </div>
  );
}
