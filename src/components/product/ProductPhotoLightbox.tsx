"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useId, useRef, type ReactNode } from "react";
import type { DetailPhoto } from "@/server/shopify/product-detail-media";
import { useSwipeRail } from "@/hooks/useSwipeRail";

export const photoIconButton =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-2xl leading-none hover:bg-cream-deep focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-30";

export function ProductPhotoLightbox({
  photos,
  title,
  regionLabel,
  children,
}: {
  photos: (Pick<DetailPhoto, "url" | "alt"> | DetailPhoto)[];
  title: string;
  regionLabel: string;
  children: (open: (button: HTMLButtonElement, index: number) => void) => ReactNode;
}) {
  const t = useTranslations("product.buyerPhotos");
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const rail = useSwipeRail(photos.length);

  function open(button: HTMLButtonElement, index: number) {
    trigger.current = button;
    dialog.current?.showModal();
    rail.goTo(index, false);
  }

  return (
    <>
      {children(open)}
      <dialog
        ref={dialog}
        data-product-photo-dialog
        aria-labelledby={id + "-dialog"}
        className="bg-paper text-ink rounded-card fixed inset-0 m-auto h-[min(92dvh,52rem)] w-[calc(100%-1.5rem)] max-w-[56rem] overflow-hidden backdrop:bg-black/45"
        onClose={() => trigger.current?.focus({ preventScroll: true })}
        onKeyDown={(event) => {
          if (event.altKey || event.metaKey || event.ctrlKey) return;
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          rail.goTo(rail.active + (event.key === "ArrowRight" ? 1 : -1));
        }}
      >
        <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto]">
          <header className="flex items-center justify-between gap-3 px-4 py-2 md:px-6">
            <h2 id={id + "-dialog"} className="font-display text-xl font-semibold">
              {title}
            </h2>
            <button
              type="button"
              className={photoIconButton}
              aria-label={t("close")}
              onClick={() => dialog.current?.close()}
            >
              <span aria-hidden="true">×</span>
            </button>
          </header>
          <div
            ref={rail.viewportRef}
            className="bg-cream-deep overflow-hidden"
            role="region"
            aria-label={regionLabel}
            aria-roledescription="carousel"
            style={{ touchAction: "pan-y pinch-zoom" }}
            {...rail.handlers}
          >
            <div
              ref={rail.trackRef}
              className="grid h-full auto-cols-[100%] grid-flow-col"
              style={rail.trackStyle}
            >
              {photos.map((photo, index) => (
                <div key={index} aria-hidden={index !== rail.active} className="relative min-w-0">
                  {"crop" in photo && photo.crop ? (
                    <div className="[container-type:size] flex h-full items-center justify-center px-3">
                      <div
                        className="max-w-full"
                        style={{ width: `min(100cqw, ${100 * photoAspectRatio(photo)}cqh)` }}
                      >
                        <ProductPhotoImage photo={photo} sizes="(max-width: 920px) 96vw, 896px" />
                      </div>
                    </div>
                  ) : (
                    <Image
                      src={photo.url}
                      alt={photo.alt}
                      fill
                      sizes="(max-width: 920px) 96vw, 896px"
                      className="object-contain"
                      draggable={false}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-1.5 md:px-6">
            <button
              type="button"
              className={photoIconButton}
              aria-label={t("previous")}
              disabled={rail.active === 0}
              onClick={() => rail.goTo(rail.active - 1)}
            >
              <span aria-hidden="true">‹</span>
            </button>
            <p className="text-ink-muted text-sm tabular-nums" aria-live="polite">
              {rail.active + 1} / {photos.length}
            </p>
            <button
              type="button"
              className={photoIconButton}
              aria-label={t("next")}
              disabled={rail.active === photos.length - 1}
              onClick={() => rail.goTo(rail.active + 1)}
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

function photoAspectRatio({ width, height, crop }: DetailPhoto) {
  return crop ? (width * crop.width) / (height * crop.height) : width / height;
}

export function ProductPhotoImage({ photo, sizes }: { photo: DetailPhoto; sizes: string }) {
  const { url, width, height, alt, crop } = photo;
  return (
    <span
      className="relative block overflow-hidden"
      style={{ aspectRatio: photoAspectRatio(photo) }}
    >
      <Image
        src={url}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        draggable={false}
        className={crop ? "absolute h-auto max-w-none" : "h-auto w-full"}
        style={
          crop
            ? {
                width: `${100 / crop.width}%`,
                left: `${(-100 * crop.left) / crop.width}%`,
                top: `${(-100 * crop.top) / crop.height}%`,
              }
            : undefined
        }
      />
    </span>
  );
}
