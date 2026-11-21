import { fetchProductBuyerPhotos } from "@/server/shopify/buyer-photos";
import { BuyerPhotoGallery } from "./BuyerPhotoGallery";

export async function ProductBuyerPhotos({
  handle,
  country,
  productName,
}: {
  handle: string;
  country: string;
  productName: string;
}) {
  const photos = await fetchProductBuyerPhotos(handle, country);
  return photos.length > 0 ? <BuyerPhotoGallery photos={photos} productName={productName} /> : null;
}
