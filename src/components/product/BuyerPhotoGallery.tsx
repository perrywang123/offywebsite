"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useId } from "react";
import type { BuyerPhoto } from "@/server/shopify/buyer-photos";
import { photoIconButton, ProductPhotoLightbox } from "./ProductPhotoLightbox";

export function BuyerPhotoGallery({
  photos,
  productName,
}: {
  photos: BuyerPhoto[];
  productName: string;
}) {
  const t = useTranslations("product.buyerPhotos");
  const id = useId();
  const labeledPhotos = photos.map(({ url, alt }, index) => ({
    url,
    alt: alt || t("photoAlt", { productName, number: index + 1 }),
  }));

  return (
    <ProductPhotoLightbox photos={labeledPhotos} title={t("title")} regionLabel={t("enlarged")}>
      {(open) => (
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
              className={photoIconButton}
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
                  alt={labeledPhotos[index].alt}
                  fill
                  sizes="(max-width: 767px) 30vw, 31vw"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </section>
      )}
    </ProductPhotoLightbox>
  );
}
