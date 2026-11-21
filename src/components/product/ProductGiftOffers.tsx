import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { fetchProductGiftOffers } from "@/server/shopify/product-gifts";

export async function ProductGiftOffers({
  handle,
  country,
  variantId,
}: {
  handle: string;
  country: string;
  variantId: string;
}) {
  const offers = await fetchProductGiftOffers(handle, country, variantId);
  if (!offers) return null;

  const t = await getTranslations("product.gifts");
  return (
    <details open className="pdp-disclosure border-cream-line border-t" data-product-gifts>
      <summary>{offers.title || t("title")}</summary>
      <ul className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {offers.tiers.map((tier) => (
          <li key={tier.id} className="min-w-0">
            <Link
              href={`/products/${tier.handle}`}
              prefetch={false}
              className="group rounded-soft block focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <div className="rounded-soft bg-paper relative mb-2 aspect-square overflow-hidden">
                <Image
                  src={tier.url}
                  alt=""
                  fill
                  sizes="(max-width: 767px) 30vw, 15vw"
                  className="object-contain"
                />
              </div>
              <p className="text-sm font-semibold break-words group-hover:underline">{tier.name}</p>
              <p className="text-ink-muted mt-1 text-xs">
                {t("threshold", { minimum: tier.minimum })}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-ink-muted mt-3 text-xs leading-relaxed">{offers.terms || t("terms")}</p>
    </details>
  );
}
