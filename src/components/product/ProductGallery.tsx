"use client";

import Image from "next/image";
import { useSwipeRail } from "@/hooks/useSwipeRail";

type Props = { images: string[]; alt: string; sizes: string };

/** A new image set mounts a fresh rail, without carrying a previous product's selection/gesture. */
export function ProductGallery(props: Props) {
  return <GalleryRail key={JSON.stringify([props.alt, props.images])} {...props} />;
}

function GalleryRail({ images, alt, sizes }: Props) {
  const rail = useSwipeRail(images.length);
  if (!images.length)
    return (
      <div className="bg-cream-deep text-ink-soft flex aspect-[4/5] items-center justify-center text-sm">
        Image coming soon
      </div>
    );
  return (
    <>
      <div
        ref={rail.viewportRef}
        role="region"
        aria-label={`${alt} images`}
        aria-roledescription="carousel"
        tabIndex={images.length > 1 ? 0 : undefined}
        className="bg-cream-deep relative aspect-[4/5] overflow-hidden rounded-[calc(var(--radius-card)-8px)] focus-visible:outline-2 focus-visible:outline-offset-2 md:aspect-[3/4]"
        style={{ touchAction: "pan-y pinch-zoom" }}
        {...rail.handlers}
        onKeyDown={(event) => {
          if (
            event.target !== event.currentTarget ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey
          )
            return;
          const target =
            event.key === "ArrowRight"
              ? rail.active + 1
              : event.key === "ArrowLeft"
                ? rail.active - 1
                : event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? images.length - 1
                    : null;
          if (target === null) return;
          event.preventDefault();
          rail.goTo(target);
        }}
      >
        <div
          data-testid="product-image-track"
          ref={rail.trackRef}
          style={{
            ...rail.trackStyle,
            display: "grid",
            gridAutoFlow: "column",
            gridAutoColumns: "100%",
            width: "100%",
            height: "100%",
            willChange: "transform",
          }}
        >
          {images.map((src, i) => (
            <div
              key={`${src}-${i}`}
              aria-hidden={i !== rail.active}
              inert={i !== rail.active}
              className="relative min-w-0"
            >
              <Image
                src={src}
                alt={i === rail.active ? alt : ""}
                fill
                priority={i === 0}
                sizes={sizes}
                className="object-contain"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
      {images.length > 1 && (
        <div className="hscroll mt-3 gap-2.5 pb-2">
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => rail.goTo(i)}
              aria-current={i === rail.active ? "true" : undefined}
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
