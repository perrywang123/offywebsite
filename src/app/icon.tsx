import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";
export const dynamic = "force-static";

/** Square browser canvas; the existing wide logo retains its original ratio. */
export default async function Icon() {
  const logo = await readFile(join(process.cwd(), "public/assets/brand/is-offy-logo.png"));
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        background: "white",
        borderRadius: 10,
      }}
    >
      <img
        alt="is.offy"
        src={`data:image/png;base64,${logo.toString("base64")}`}
        width={58}
        height={(58 * 408) / 1084}
      />
    </div>,
    size,
  );
}
