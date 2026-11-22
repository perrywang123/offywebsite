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
    <section
      className="border-cream-line border-t pt-3"
      aria-labelledby="product-gift-heading"
      data-product-gifts
    >
      <h2 id="product-gift-heading" className="mb-3 font-semibold">
        {offers.title || t("title")}
      </h2>
      <ul className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {offers.tiers.map((tier) => (
          <li key={tier.id} className="min-w-0">
            <Link
              href={`/products/${tier.handle}`}
              prefetch={false}
              className="group rounded-soft block focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <div className="rounded-soft bg-paper relative mb-2 aspect-[3/4] overflow-hidden">
                <Image
                  src={tier.url}
                  alt=""
                  fill
                  sizes="(max-width: 767px) 30vw, 15vw"
                  className="object-cover"
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
    </section>
  );
}
