import { getDb } from "@/server/db/client";
import { homeImageResponse } from "@/server/home-content/media";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return homeImageResponse(getDb(), id);
}
