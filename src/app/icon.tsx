import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 96, height: 96 };
export const contentType = "image/png";
export const dynamic = "force-static";

/** Owner-supplied square artwork; no stretching and no change to the Header wordmark. */
export default async function Icon() {
  const logo = await readFile(join(process.cwd(), "public/assets/brand/offy-search-logo.png"));
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        background: "white",
      }}
    >
      <img
        alt="is.offy"
        src={`data:image/png;base64,${logo.toString("base64")}`}
        width={96}
        height={96}
      />
    </div>,
    size,
  );
}
