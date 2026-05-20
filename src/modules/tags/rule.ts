/**
 * v0.2 — 正文 #tag inline rule(Unicode 友好,带边界过滤)。
 */

import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs'
import type MarkdownIt from 'markdown-it'
import type { AllYouNeedEnv } from '../../core/types.js'
import { escapeHtml } from '../../utils/escape.js'
import { applyCleanUrls } from '../../utils/url.js'

const TAG_RE = /^#([\p{L}_][\p{L}\p{N}_/-]*)/u

function isValidPrecedingChar(c: string | undefined): boolean {
  if (c === undefined) return true
  if (/\s/.test(c)) return true
  if ('([{,;。,;'.includes(c)) return true
  return false
}

export function makeTagRule(): (state: StateInline, silent: boolean) => boolean {
  return function tagRule(state, silent) {
    const start = state.pos
    const src = state.src
    if (src.charCodeAt(start) !== 0x23 /* # */) return false

    const prev = start === 0 ? undefined : src[start - 1]
    if (!isValidPrecedingChar(prev)) return false

    const slice = src.slice(start)
    const m = TAG_RE.exec(slice)
    if (!m) return false

    const tag = m[1]!
    if (silent) return true

    const env = state.env as AllYouNeedEnv & { referencedTags?: Set<string> }
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

    state.pos = start + m[0].length
    return true
  }
}

export function registerTagsInline(md: MarkdownIt): void {
  md.inline.ruler.before('link', 'allyouneed_tags', makeTagRule())
}
