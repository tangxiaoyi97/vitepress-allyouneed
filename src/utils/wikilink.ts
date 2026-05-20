/**
 * v0.3.4 — wikilink inner 段拆分工具。
 *
 * Obsidian 表格 cell 里写 wikilink 时会用 `\|` 转义 pipe(否则被 markdown
 * 当成 cell 分隔):`[[Foo\|Bar]]` 应解读为 target=`Foo`、alias=`Bar`。
 *
 * 原实现各处用 `inner.split('|')` 直接拆,target 变成 `Foo\`(带反斜杠
 * 尾巴),resolver 找不到 → 全部死链。
 *
 * 该工具统一处理:`\|` 视为 pipe 分隔符(同 `|`),且不留 `\` 在结果里。
 */

/**
 * 把 wikilink 的内容(去掉 `[[` / `]]` 后)按 pipe 拆段。
 * 支持 Obsidian 的 `\|` 转义。**保留**段内空格(只 trim 两端)。
 *
 * @example
 *   splitWikilinkInner('Foo|Bar')              // ['Foo', 'Bar']
 *   splitWikilinkInner('Foo\\|Bar')            // ['Foo', 'Bar']
 *   splitWikilinkInner('img.png|alt with space|300x200')
 *     // ['img.png', 'alt with space', '300x200']
 */
export function splitWikilinkInner(inner: string): string[] {
  // 正则 \\?\| 同时匹配 '\|' 和 '|';\\? 把可选的反斜杠吃掉,
  // 这样 target 不会留 trailing '\'
  return inner.split(/\\?\|/).map((p) => p.trim())
}
