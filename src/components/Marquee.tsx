export function Marquee({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  // 系统开启"减弱动态效果"时动画体系整体停摆(globals.css 的
  // `*[class*="animate-"] { animation: none }`),横滑的走马灯会退化成
  // 一条被 `overflow-hidden` + `whitespace-nowrap` 裁掉的静止文字。
  // 所以 reduced-motion 下改成正常换行的静态块,文案完整可读;
  // 为无缝循环而存在的第二份内容同时隐藏(它对读屏本来就是 aria-hidden)。
  return (
    <div
      className={`border-sand bg-ink text-cream overflow-hidden border-y py-3 whitespace-nowrap motion-reduce:text-center motion-reduce:whitespace-normal ${className}`}
    >
      <div className="animate-marquee flex w-max gap-8 hover:[animation-play-state:paused] motion-reduce:block motion-reduce:w-full">
        <span className="shrink-0">{children}</span>
        <span className="shrink-0 motion-reduce:hidden" aria-hidden>
          {children}
        </span>
      </div>
    </div>
  );
}
