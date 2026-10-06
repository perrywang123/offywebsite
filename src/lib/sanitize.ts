/**
 * 极简 HTML 白名单消毒器 —— 用于渲染 Shopify 后台配置的「书面政策」正文。
 *
 * 为什么需要:政策正文是后台富文本,直接 `dangerouslySetInnerHTML` 就是一条 XSS
 * 通道(只要有人往政策里粘一段带 `<script>` 的富文本)。实测当前四个政策正文
 * 只有 `p/b/br/i/span/table` 且无事件属性,但"当前干净"不能当保证。
 *
 * 策略:
 *   · 白名单标签保留,其余标签**连同 script/style 的内容**一起丢弃
 *   · **所有属性一律剥掉** —— 政策正文里的 `class="p1"` 是 PDF/Word 导出产物,
 *     对本站样式毫无意义;唯一例外是 `<a href>`,且要过协议校验
 *   · 文本里的 HTML 实体原样保留(不解码、不二次转义),避免 `&ndash;` 被转成
 *     `&amp;ndash;` 显示成字面量
 *   · 不引入依赖:实现为一个可单测的纯函数,而不是用正则去"解析"HTML
 */

/** 允许保留的标签。政策正文实测出现:p b br i span table tbody tr td。 */
const ALLOWED_TAGS = new Set([
  "p", "br", "hr", "span", "div",
  "b", "strong", "i", "em", "u", "s", "sub", "sup", "small",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "dl", "dt", "dd",
  "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption",
  "blockquote", "code", "pre", "a",
]);

/** 内容整体丢弃(而不是只丢标签)的标签。 */
const DROP_CONTENT_TAGS = new Set(["script", "style", "noscript", "template", "iframe", "object", "embed"]);

/** 自闭合标签,不产出结束标签。 */
const VOID_TAGS = new Set(["br", "hr"]);

/** 每个标签允许保留的属性(白名单之外的一律剥掉)。 */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href"]),
};

/** href 只允许这些协议(以及站内相对路径)。 */
function safeHref(raw: string): string | null {
  const v = raw.trim();
  if (v === "") return null;
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  // 站内相对路径 / 锚点
  if (/^[/#]/.test(v)) return v;
  return null;
}

interface ParsedTag {
  name: string;
  closing: boolean;
  selfClosing: boolean;
  attrs: Array<[string, string]>;
}

function parseTag(raw: string): ParsedTag | null {
  const body = raw.trim();
  if (body === "" || body.startsWith("!") || body.startsWith("?")) return null;
  // 片段里又出现 "<" → 说明起始那个 "<" 是正文里的散落尖括号(如 "a < b"),
  // 真正的标签边界在更后面;按非标签处理,交给调用方只跳过这个 "<"。
  if (body.includes("<")) return null;

  const closing = body.startsWith("/");
  const rest = closing ? body.slice(1).trim() : body;
  const m = /^([a-zA-Z][a-zA-Z0-9-]*)/.exec(rest);
  if (!m) return null;
  const name = m[1].toLowerCase();

  const selfClosing = /\/$/.test(rest);
  const attrs: Array<[string, string]> = [];
  // 只做简单属性解析:name="v" / name='v' / name=v / name
  const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  attrRe.lastIndex = m[0].length;
  let am: RegExpExecArray | null;
  while ((am = attrRe.exec(rest)) !== null) {
    attrs.push([am[1].toLowerCase(), am[2] ?? am[3] ?? am[4] ?? ""]);
  }
  return { name, closing, selfClosing, attrs };
}

function renderTag(tag: ParsedTag): string {
  if (!ALLOWED_TAGS.has(tag.name)) return "";
  if (VOID_TAGS.has(tag.name)) return `<${tag.name}>`;
  if (tag.closing) return `</${tag.name}>`;

  const allowed = ALLOWED_ATTRS[tag.name];
  let out = `<${tag.name}`;
  let hasHref = false;
  if (allowed) {
    for (const [k, v] of tag.attrs) {
      if (!allowed.has(k)) continue;
      if (k === "href") {
        const href = safeHref(v);
        if (href) {
          out += ` href="${href.replace(/"/g, "&quot;")}"`;
          hasHref = true;
        }
        continue;
      }
      out += ` ${k}="${v.replace(/"/g, "&quot;")}"`;
    }
  }
  // 政策里的外链一律新开标签页,并断开 opener(没有 href 就不加,免得留个空壳 a)
  if (tag.name === "a" && hasHref) out += ' rel="noopener noreferrer" target="_blank"';
  return `${out}>`;
}

/**
 * 消毒政策正文。未在白名单内的标签整段丢弃(其纯文本内容会作为文本保留下来,
 * 因此 `<script>alert(1)</script>` 既不会执行,残留的 `alert(1)` 也只是字面量)。
 */
export function sanitizePolicyHtml(html: string): string {
  let out = "";
  let i = 0;

  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt === -1) {
      out += html.slice(i);
      break;
    }
    out += html.slice(i, lt);
    const gt = html.indexOf(">", lt);
    if (gt === -1) {
      // 没有闭合的尖括号:丢弃这一小段,不吞掉后面的正文
      break;
    }

    const tag = parseTag(html.slice(lt + 1, gt));
    if (tag && DROP_CONTENT_TAGS.has(tag.name) && !tag.closing) {
      // 连内容一起丢掉
      const closeRe = new RegExp(`</${tag.name}\\s*>`, "i");
      const rest = html.slice(gt + 1);
      const cm = closeRe.exec(rest);
      i = cm ? gt + 1 + cm.index + cm[0].length : html.length;
      continue;
    }
    if (tag) {
      out += renderTag(tag);
      i = gt + 1;
    } else {
      // 不是标签:只跳过这个 "<",后面的纯文本继续按文本输出
      i = lt + 1;
    }
  }
  return out;
}
