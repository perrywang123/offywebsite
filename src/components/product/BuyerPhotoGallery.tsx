"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useId, useRef } from "react";
import { useSwipeRail } from "@/hooks/useSwipeRail";
import type { BuyerPhoto } from "@/server/shopify/buyer-photos";

const iconButton =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-2xl leading-none hover:bg-cream-deep focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-30";

export function BuyerPhotoGallery({
  photos,
  productName,
}: {
  photos: BuyerPhoto[];
  productName: string;
}) {
  const t = useTranslations("product.buyerPhotos");
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const rail = useSwipeRail(photos.length);
  const labels = photos.map(
    ({ alt }, index) => alt || t("photoAlt", { productName, number: index + 1 }),
  );

  function open(button: HTMLButtonElement, index: number) {
    trigger.current = button;
    rail.goTo(index, false);
    dialog.current?.showModal();
  }

  return (
    <section
      className="border-cream-line mt-10 border-t pt-6 md:mt-20 md:pt-8"
      aria-labelledby={id}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="font-display text-2xl font-semibold tracking-tight">
          {t("title")}
        </h2>
        <button
          type="button"
          className={iconButton}
          aria-label={t("view")}
          aria-haspopup="dialog"
          onClick={(event) => open(event.currentTarget, 0)}
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2.5 md:gap-4">
        {photos.slice(0, 3).map(({ url }, index) => (
          <button
            key={index}
            type="button"
            aria-label={t("open", { number: index + 1, total: photos.length })}
            aria-haspopup="dialog"
            className="rounded-soft bg-cream-deep relative aspect-square cursor-zoom-in overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={(event) => open(event.currentTarget, index)}
          >
            <Image
              src={url}
              alt={labels[index]}
              fill
              sizes="(max-width: 767px) 30vw, 31vw"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      <dialog
        ref={dialog}
        data-buyer-photo-dialog
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
              {t("title")}
            </h2>
            <button
              type="button"
              className={iconButton}
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
            aria-label={t("enlarged")}
            aria-roledescription="carousel"
            style={{ touchAction: "pan-y pinch-zoom" }}
            {...rail.handlers}
          >
            <div
              ref={rail.trackRef}
              className="grid h-full auto-cols-[100%] grid-flow-col"
              style={rail.trackStyle}
            >
              {photos.map(({ url }, index) => (
                <div key={index} aria-hidden={index !== rail.active} className="relative min-w-0">
                  <Image
                    src={url}
                    alt={labels[index]}
                    fill
                    sizes="(max-width: 920px) 96vw, 896px"
                    className="object-contain"
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-1.5 md:px-6">
            <button
              type="button"
              className={iconButton}
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
              className={iconButton}
              aria-label={t("next")}
              disabled={rail.active === photos.length - 1}
              onClick={() => rail.goTo(rail.active + 1)}
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
