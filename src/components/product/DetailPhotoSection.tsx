"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import type { DetailPhoto } from "@/server/shopify/product-detail-media";
import { ProductPhotoImage, ProductPhotoLightbox } from "./ProductPhotoLightbox";

export function DetailPhotoSection({
  details,
  guides,
}: {
  details: DetailPhoto[];
  guides: DetailPhoto[];
}) {
  const t = useTranslations("product.detailPhotos");
  const titleId = useId();
  const photos = [...details, ...guides];
  return (
    <section
      className="border-cream-line space-y-6 border-t pt-4 md:space-y-8 md:pt-5"
      aria-labelledby={details.length ? titleId : undefined}
      aria-label={details.length ? undefined : t("specifications")}
    >
      <ProductPhotoLightbox photos={photos} title={t("gallery")} regionLabel={t("enlarged")}>
        {(open) => (
          <>
            {details.length > 0 && (
              <div>
                <h2
                  id={titleId}
                  className="font-display mb-4 text-2xl font-semibold tracking-tight"
                >
                  {t("title")}
                </h2>
                <div
                  className={details.length > 1 ? "grid gap-4 md:grid-cols-3" : "mx-auto max-w-lg"}
                >
                  {details.map((photo, index) => (
                    <figure key={index}>
                      <PhotoButton
                        photo={photo}
                        label={t("open", { alt: photo.alt })}
                        sizes="(max-width: 767px) 100vw, 36vw"
                        onOpen={(button) => open(button, index)}
                      />
                      {photo.crop && (
                        <figcaption className="text-ink-muted mt-2 text-sm">{photo.alt}</figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              </div>
            )}
            {guides.length > 0 && (
              <div
                role="group"
                aria-label={t("specifications")}
                className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] md:gap-5"
              >
                {guides.map((photo, index) => (
                  <PhotoButton
                    key={index}
                    photo={photo}
                    label={t("open", { alt: photo.alt })}
                    sizes="(max-width: 640px) 100vw, 432px"
                    onOpen={(button) => open(button, details.length + index)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </ProductPhotoLightbox>
    </section>
  );
}

function PhotoButton({
  photo,
  label,
  onOpen,
  sizes,
}: {
  photo: DetailPhoto;
  label: string;
  onOpen: (button: HTMLButtonElement) => void;
  sizes: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-haspopup="dialog"
      className="rounded-soft bg-paper relative block w-full cursor-zoom-in self-start overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2"
      onClick={(event) => onOpen(event.currentTarget)}
    >
      <ProductPhotoImage photo={photo} sizes={sizes} />
    </button>
  );
}
