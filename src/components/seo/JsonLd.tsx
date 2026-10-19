/**
 * JSON-LD 输出组件(结构化数据)。
 *
 * 只生成一个 `<script type="application/ld+json">`,不渲染任何可见 DOM ——
 * 这是"加结构化数据但不许改变像素"的前提。
 *
 * 安全:`JSON.stringify` 本身不会转义 `<`,而用户可写的字段(商品名/FAQ 答案)
 * 里一旦出现 `</script>`,浏览器会就地闭合 script 标签,后面的内容就变成
 * 可执行 HTML。这里把**所有** `<` 转成 JSON 的 `\u003c` 转义 —— 对
 * `JSON.parse` 完全等价,但 HTML 解析器再也看不到 `<`。
 *
 * 服务端组件:不要加 `"use client"`。
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
