import type { DescriptionBlock } from "../description-html";

const month =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const date = String.raw`${month}\.?\s+(?:0?[1-9]|[12]\d|3[01])(?:,\s*\d{4})?`;
const clock = String.raw`(?:0?[1-9]|1[0-2])(?::[0-5]\d)?\s*(?:am|pm)\s+(?:[ecmp][sd]?t|GMT|UTC)`;
const dropSuffix = new RegExp(String.raw`\s+[—–-]\s+DROPS\s+${date}\s+AT\s+${clock}$`, "i");
const releaseDateLine = new RegExp(String.raw`^RELEASE DATE:\s*${date}\.?$`, "i");
const releaseClocks = new RegExp(String.raw`^${clock}(?:\s*/\s*${clock})*\.?$`, "i");
const previewNotice = "available for preview now. orders open at the official release time.";

/** Hide merchant-entered schedule boilerplate when the structured release is known. */
export function presentScheduledProductCopy(name: string, description: DescriptionBlock[]) {
  return {
    name: name.trim().replace(dropSuffix, ""),
    description: description.filter(({ text }, index) => {
      const line = text.trim();
      const previousLine = description[index - 1]?.text.trim() ?? "";
      return (
        !releaseDateLine.test(line) &&
        !(releaseDateLine.test(previousLine) && releaseClocks.test(line)) &&
        line.toLowerCase() !== previewNotice
      );
    }),
  };
}
