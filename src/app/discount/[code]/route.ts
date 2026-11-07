import { discountRedirect } from "@/server/collabs/storefront";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  return discountRedirect(request, (await params).code);
}
