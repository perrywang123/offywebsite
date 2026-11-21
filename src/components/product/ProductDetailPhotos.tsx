import { fetchProductDetailMedia } from "@/server/shopify/product-detail-media";
import { DetailPhotoSection } from "./DetailPhotoSection";

export async function ProductDetailPhotos({
  handle,
  country,
}: {
  handle: string;
  country: string;
}) {
  const { details, guides } = await fetchProductDetailMedia(handle, country);
  return details.length || guides.length ? (
    <DetailPhotoSection details={details} guides={guides} />
  ) : null;
}
