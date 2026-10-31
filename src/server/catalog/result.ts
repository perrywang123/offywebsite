export type CatalogResult<T> = { status: "ready"; data: T } | { status: "unavailable" };
export async function catalogResult<T>(read: Promise<T>): Promise<CatalogResult<T>> {
  try {
    return { status: "ready", data: await read };
  } catch {
    return { status: "unavailable" };
  }
}
