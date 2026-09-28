/**
 * Shopify `descriptionHtml` → structured paragraphs.
 *
 * The Shopify rich-text editor stores product descriptions as HTML, typically:
 *   <p><b>Lead sentence.</b></p>
 *   <p id="..."><span>Body copy…</span><span><!----></span></p>
 * The plain `description` field collapses those paragraphs together and loses
 * the bold lead, so we parse the HTML ourselves: split by <p>, mark blocks
 * containing <b>/<strong> as bold, strip every other tag (including editor
 * artefacts like <!----> comments, nested spans, <sup>), decode entities.
 */

export interface DescriptionBlock {
  text: string;
  bold: boolean;
}

// "\u0026" is "&" — written this way so the entity keys survive transport layers.
const AMP = "\u0026";
const ENTITY_MAP: Record<string, string> = {
  [AMP + "amp;"]: AMP,
  [AMP + "lt;"]: "<",
  [AMP + "gt;"]: ">",
  [AMP + "quot;"]: '"',
  [AMP + "apos;"]: "'",
  [AMP + "#39;"]: "'",
  [AMP + "nbsp;"]: " ",
};

function decodeEntities(s: string): string {
  return s.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39);/g, (m) => ENTITY_MAP[m] ?? m);
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function isBoldBlock(innerHtml: string): boolean {
  return /<(b|strong)(\s[^>]*)?>/i.test(innerHtml);
}

export function parseDescriptionHtml(html: string): DescriptionBlock[] {
  if (!html || !html.trim()) return [];

  const paragraphs: DescriptionBlock[] = [];
  const pRegex = /<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi;
  let match: RegExpExecArray | null;
  while ((match = pRegex.exec(html)) !== null) {
    const inner = match[1];
    const text = stripTags(inner);
    if (!text) continue;
    paragraphs.push({ text, bold: isBoldBlock(inner) });
  }

  // No <p> tags at all — treat the whole payload as one plain block.
  if (paragraphs.length === 0) {
    const text = stripTags(html);
    return text ? [{ text, bold: false }] : [];
  }

  return paragraphs;
}
