/**
 * 正文 #tag inline rule —— 识别 `#tag` / `#nested/tag` / `#中文标签`。
 *
 * 边界:
 *   - `#` 前必须是字符串首,或空白/标点(避免误吞 URL fragment、CSS ID 选择器、md heading)
 *   - `#` 后必须紧跟非空白可见字符,不能是空格(那是 markdown heading)
 *   - 不在 code span / code fence 内(markdown-it 默认按 token 处理,inline rule 不进 code)
 *   - 不在 link target / autolink 内(我们 register 在 'link' 之后能避开 [text](href) 的 href)
 *
 * 解析后:
 *   - 渲染为 `<a class="tag" href="<base>/tags#<tag>">#tag</a>`(链到 tags.md,锚点是标签名)
 *   - 同时把 tag 登记到当前 page 的 env.referencedTags(Set),供 vault-data.json 生成时合并到 frontmatter tags
 */

import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs'
import type MarkdownIt from 'markdown-it'
import type { AllYouNeedEnv } from '../../core/types.js'
import { escapeHtml } from '../../utils/escape.js'

/**
 * 一个 tag 字符的字符集:
 *   - 字母数字 _-
 *   - 路径分隔 /
 *   - Unicode(中文等):用 \p{L}\p{N} 配 /u 标志
 *
 * 第一个字符不能是数字(避免和 `#404` 这种数字串歧义)
 */
const TAG_RE = /^#([\p{L}_][\p{L}\p{N}_/-]*)/u

/**
 * 判断 `#` 前一个字符是不是合法的"tag 启动点"。
 * 允许:行首(undefined)、空白、常见标点(`(`, `[`, ...)
 * 禁止:字母数字(避免 URL fragment 如 https://x/#section)、`&`(HTML entity)
 */
function isValidPrecedingChar(c: string | undefined): boolean {
  if (c === undefined) return true
  // 空白
  if (/\s/.test(c)) return true
  // 常见允许前置标点
  if ('([{,;。,;'.includes(c)) return true
  return false
}

export function makeTagRule(): (state: StateInline, silent: boolean) => boolean {
  return function tagRule(state, silent) {
    const start = state.pos
    const src = state.src
    if (src.charCodeAt(start) !== 0x23 /* # */) return false

    // 前一个字符校验
    const prev = start === 0 ? undefined : src[start - 1]
    if (!isValidPrecedingChar(prev)) return false

    // 试匹配 tag(从 # 开始)
    const slice = src.slice(start)
    const m = TAG_RE.exec(slice)
    if (!m) return false

    const tag = m[1]!
    if (silent) return true

    // 登记到 env
    const env = state.env as AllYouNeedEnv & { referencedTags?: Set<string> }
    if (!env.referencedTags) env.referencedTags = new Set()
    env.referencedTags.add(tag)

    // 渲染:<a class="tag" data-tag="..." href="<base>/<tags>#<tag>">#tag</a>
    const tagsViewName =
      env.options?.views?.names?.tags ?? 'tags'
    const base = env.options?.base ?? '/'
    const href = `${base}${tagsViewName}#${encodeURIComponent(tag)}`
    const html =
      `<a class="ayn-tag" data-tag="${escapeHtml(tag)}" ` +
      `href="${escapeHtml(href)}">#${escapeHtml(tag)}</a>`

    const token = state.push('html_inline', '', 0)
    token.content = html

    state.pos = start + m[0].length
    return true
  }
}

/**
 * 注册到 markdown-it 实例;放在 link 之前,避免被 `[text](#frag)` 的 fragment 误吞。
 */
export function registerTagsInline(md: MarkdownIt): void {
  md.inline.ruler.before('link', 'allyouneed_tags', makeTagRule())
}
