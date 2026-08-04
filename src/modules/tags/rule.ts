/**
 * v0.2 — 正文 #tag inline rule(Unicode 友好,带边界过滤)。
 */

import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs'
import type MarkdownIt from 'markdown-it'
import type { AllYouNeedEnv } from '../../core/types.js'
import { escapeHtml } from '../../utils/escape.js'
import { applyCleanUrls } from '../../utils/url.js'
import {
  DEFAULT_INLINE_TAG_PATTERN,
  isValidTagBoundary,
  matchInlineTag,
} from '../../core/tags.js'

export function makeTagRule(): (state: StateInline, silent: boolean) => boolean {
  return function tagRule(state, silent) {
    const start = state.pos
    const src = state.src
    if (src.charCodeAt(start) !== 0x23 /* # */) return false

    const prev = start === 0 ? undefined : src[start - 1]
    if (!isValidTagBoundary(prev)) return false

    const slice = src.slice(start)
    // v0.3.9:优先从 env.options.views.inlineTagPattern 读;没注入就用默认
    const env = state.env as AllYouNeedEnv & { referencedTags?: Set<string> }
    const pattern = env.options?.views?.inlineTagPattern ?? DEFAULT_INLINE_TAG_PATTERN
    const match = matchInlineTag(slice, pattern)
    if (!match) return false
    const tag = match.tag

    // ── HOTFIX(0.5.2):silent 模式必须**推进 state.pos** ───────────────
    // 与 wikilink rule 同一类 bug(见 modules/wikilinks/rule.ts 的 0.5.1 注释)。
    // markdown-it 的 link 核心规则扫描 `[...]` label 时用 `skipToken` 以 silent
    // 模式跑 inline rule;silent 返回 true 却不推进 state.pos → 抛
    // `inline rule didn't increment state.pos`(parser_inline.mjs)。
    //
    // 触发:GFM 表格单元格 `[[#Biomarker|Biomarker]]` 被 `|` 拆成 `[[#Biomarker`,
    // 其中的 `[` 触发 link 规则的 parseLinkLabel,扫到 `#Biomarker` 时本 tag 规则
    // (silent)pos 没动 → 整个 vitepress build 崩(file: …Astronomie…md)。
    // 任何 `[` 上下文里出现 `#tag` 都会复现,不限表格。
    //
    // 修法对齐 markdown-it 自带规则:silent 也设 pos,仅把 token 产出门控在 !silent。
    if (silent) {
      state.pos = start + match.length
      return true
    }

    if (!env.referencedTags) env.referencedTags = new Set()
    env.referencedTags.add(tag)

    const tagsViewName = env.options?.views?.names?.tags ?? 'tags'
    const urlPrefix = env.options?.views?.urlPrefix ?? '_perspectives_'
    const base = env.options?.base ?? '/'
    const cleanUrls = env.options?.cleanUrls ?? true
    const prefixSeg = urlPrefix ? `${urlPrefix}/` : ''
    // v0.3.4:cleanUrls=false 时要加 .html,否则浏览器直接访问 /...../tags 404
    const pagePath = applyCleanUrls(`${prefixSeg}${tagsViewName}`, cleanUrls)
    const href = `${base}${pagePath}#${encodeURIComponent(tag)}`
    const html =
      `<a class="ayn-tag" data-tag="${escapeHtml(tag)}" ` +
      `href="${escapeHtml(href)}">#${escapeHtml(tag)}</a>`

    const token = state.push('html_inline', '', 0)
    token.content = html

    state.pos = start + match.length
    return true
  }
}

export function registerTagsInline(md: MarkdownIt): void {
  md.inline.ruler.before('link', 'allyouneed_tags', makeTagRule())
}
