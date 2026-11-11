// @vitest-environment node
import { describe, expect, it } from "vitest";
import Icon, { contentType, size } from "./icon";

describe("OFFY browser icon", () => {
  it("serves a real square PNG instead of stretching the horizontal logo", async () => {
    const response = await Icon();
    expect(contentType).toBe("image/png");
    expect(response.headers.get("content-type")).toContain("image/png");
    const image = Buffer.from(await response.arrayBuffer());
    expect(image.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(image.readUInt32BE(16)).toBe(size.width);
    expect(image.readUInt32BE(20)).toBe(size.height);
    expect(size).toEqual({ width: 64, height: 64 });
  });
});
