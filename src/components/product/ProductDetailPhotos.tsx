import { fetchProductDetailMedia } from "@/server/shopify/product-detail-media";
import { DetailPhotoSection } from "./DetailPhotoSection";

export async function ProductDetailPhotos({
  handle,
  country,
}: {
  handle: string;
  country: string;
}) {
  const { guides } = await fetchProductDetailMedia(handle, country);
  // Pause the separate close-up section while its layout is under review.
  return guides.length ? <DetailPhotoSection details={[]} guides={guides} /> : null;
}
