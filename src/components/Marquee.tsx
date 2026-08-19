export function Marquee({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden whitespace-nowrap border-y border-sand bg-ink py-3 text-cream ${className}`}
    >
      <div className="flex w-max animate-marquee gap-8 hover:[animation-play-state:paused]">
        <span className="shrink-0">{children}</span>
        <span className="shrink-0" aria-hidden>
          {children}
        </span>
      </div>
    </div>
  );
}
