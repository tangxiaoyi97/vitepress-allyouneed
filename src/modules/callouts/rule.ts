/**
 * Obsidian callouts —— `> [!type][+-]? <title>` 块语法。
 *
 * 实现思路:
 *   - 注册一条 markdown-it **core** rule(在 'inline' 之后跑),扫所有 token
 *     找到 blockquote_open ... paragraph_open ... 第一段首行是 `[!type] ...` 的,
 *     把整块 blockquote 改写成 html_block 包 `<div class="callout">…</div>`
 *   - 嵌套:Obsidian 嵌套 callout 用 `> > [!info]`,markdown-it blockquote
 *     本身递归,我们 core rule 也递归扫所有 blockquote_open
 *   - 渲染 body:用 md.render(bodyMarkdown, env) 把内层 markdown 递归渲染
 *     成 HTML,贴到 .callout-content
 *
 * 不写 markdown-it 的 block ruler 自定义 —— blockquote 的解析已经稳,
 * 我们后置改写 token 流更安全。
 */

import type MarkdownIt from 'markdown-it'
import type Token from 'markdown-it/lib/token.mjs'
import type StateCore from 'markdown-it/lib/rules_core/state_core.mjs'
import type { AllYouNeedEnv } from '../../core/types.js'
import { escapeHtml } from '../../utils/escape.js'
import {
  normalizeCalloutType,
  DEFAULT_TITLES,
  CALLOUT_ICONS,
  type CalloutCanonical,
  type CalloutFoldable,
  type CalloutHeader,
} from './types.js'

const HEADER_RE = /^\[!([a-zA-Z]+)\]([+-]?)\s*(.*)$/

/**
 * 解析 callout 头(第一段第一行)。返回 null 表示不是 callout。
 */
export function parseCalloutHeader(line: string): CalloutHeader | null {
  const m = HEADER_RE.exec(line.trim())
  if (!m) return null
  const type = normalizeCalloutType(m[1]!)
  const foldChar = m[2]!
  const foldable: CalloutFoldable =
    foldChar === '+' ? 'open' : foldChar === '-' ? 'closed' : null
  return { type, foldable, title: (m[3] ?? '').trim() }
}

/**
 * core 规则:扫 state.tokens,把 callout-blockquote 改写为 html_block。
 *
 * Token 结构:
 *   blockquote_open
 *     paragraph_open
 *       inline { children: [text "[!type] ...", softbreak, text "rest"] }
 *     paragraph_close
 *     (可能有更多 children)
 *   blockquote_close
 */
export function registerCalloutsCore(md: MarkdownIt): void {
  md.core.ruler.after(
    'inline',
    'allyouneed_callouts',
    function calloutsRule(state: StateCore): boolean {
      const tokens = state.tokens
      // 从后往前扫,改写时 splice 不影响前面 index
      for (let i = tokens.length - 1; i >= 0; i--) {
        const t = tokens[i]!
        if (t.type !== 'blockquote_open') continue
        // 找配对的 blockquote_close
        const closeIdx = findMatchingClose(tokens, i)
        if (closeIdx < 0) continue
        // 检查首段第一行
        const inner = tokens.slice(i + 1, closeIdx)
        const header = extractHeader(inner)
        if (!header) continue
        // 提取剩余内容(去掉 header 行后的所有内容)
        const bodyHtml = renderBody(inner, header.firstLineRest, md, state.env)
        // v0.3.4:标题走 inline 渲染,**bold**/`code`/[[wiki]] 等都生效
        const html = renderCallout(
          header.parsed,
          bodyHtml,
          md,
          state.env,
          t.attrGet('id') ?? undefined,
          t.attrGet('class') ?? undefined,
        )
        // 用 html_block 替换 blockquote_open...blockquote_close
        const newToken = new state.Token('html_block', '', 0)
        newToken.content = html + '\n'
        newToken.map = t.map
        tokens.splice(i, closeIdx - i + 1, newToken)
      }
      return false
    },
  )
}

/** 找配对 blockquote_close,考虑嵌套 */
function findMatchingClose(tokens: Token[], openIdx: number): number {
  let depth = 0
  for (let i = openIdx; i < tokens.length; i++) {
    const t = tokens[i]!
    if (t.type === 'blockquote_open') depth++
    else if (t.type === 'blockquote_close') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

interface ExtractedHeader {
  parsed: CalloutHeader
  /** header 之后同一段的剩余文本(softbreak 之后的部分)*/
  firstLineRest: string
}

/**
 * 从 blockquote 内部 token 序列中提取 callout header。
 * Header 必须是首个 paragraph 的第一行。返回 null 表示不是 callout。
 */
function extractHeader(inner: Token[]): ExtractedHeader | null {
  // 找第一个 paragraph_open
  if (inner.length === 0) return null
  const first = inner[0]!
  if (first.type !== 'paragraph_open') return null
  const inlineToken = inner[1]
  if (!inlineToken || inlineToken.type !== 'inline') return null

  const content = inlineToken.content
  // 取首行
  const newlineIdx = content.indexOf('\n')
  const firstLine = newlineIdx >= 0 ? content.slice(0, newlineIdx) : content
  const rest = newlineIdx >= 0 ? content.slice(newlineIdx + 1) : ''

  const parsed = parseCalloutHeader(firstLine)
  if (!parsed) return null

  return { parsed, firstLineRest: rest }
}

/**
 * 渲染 callout body:把 header 之后的 markdown 内容用 md.render 递归渲染。
 */
function renderBody(
  inner: Token[],
  firstLineRest: string,
  md: MarkdownIt,
  env: unknown,
): string {
  // 重建 body markdown:首段去掉 header 行后的内容,加上 inner 后续 block
  // 简化策略:把 inner 渲染回 markdown 不容易,改成直接 render 剩余 tokens
  // 但 markdown-it 的 renderer 是 token → html,我们已经有 inner tokens 了。
  // 不过首段的 inline token 还含 header 行,需要替换 content。

  if (inner.length < 3) {
    // 只有空段,body 为空
    return ''
  }

  // Clone inner tokens,替换首段 inline.content 为 firstLineRest
  const cloned: Token[] = inner.map((t) => {
    const c = new (t.constructor as new (
      type: string,
      tag: string,
      nesting: number,
    ) => Token)(t.type, t.tag, t.nesting)
    Object.assign(c, t)
    // 注意 children 是数组,需要重新做 clone(避免共享)
    if (t.children) c.children = [...t.children]
    return c
  })

  // 替换首段 inline 的 content;若 rest 为空,把首段三个 token(open/inline/close)
  // 整段移除
  if (firstLineRest.trim() === '') {
    cloned.splice(0, 3)
  } else {
    const inlineToken = cloned[1]!
    inlineToken.content = firstLineRest
    // markdown-it 渲染 inline token 看的是 children 而不是 content;
    // 我们改了 content 必须重新 parse 一次,把新 children 填回去
    const newChildren: Token[] = []
    inlineToken.children = newChildren
    md.inline.parse(firstLineRest, md, env as object, newChildren)
  }

  return md.renderer.render(cloned, md.options, env)
}

/**
 * 渲染 callout 最终 HTML。
 *
 * v0.3.4:displayTitle 走 md.renderInline (Obsidian 行为) —— `**bold**` /
 * `[[wikilink]]` / `==高亮==` 等行内语法在 callout 标题里都生效。
 * 默认标题(无自定义,纯类型名)还是 escape 一次 + 包 span。
 */
function renderCallout(
  header: CalloutHeader,
  bodyHtml: string,
  md: MarkdownIt,
  env: object,
  blockId?: string,
  blockClass?: string,
): string {
  const { type, foldable, title } = header
  const rawTitle = title || DEFAULT_TITLES[type]
  // 有用户自定义标题就走 inline parse;没有就 escape 一下纯字符串
  const titleHtml = title
    ? md.renderInline(rawTitle, env)
    : escapeHtml(rawTitle)
  const iconSvg =
    `<svg class="callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
    `stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
    CALLOUT_ICONS[type] +
    `</svg>`

  const cls = [
    `callout callout--${type}` + (foldable ? ' callout--foldable' : ''),
    blockClass,
  ].filter(Boolean).join(' ')
  const idAttr = blockId ? ` id="${escapeHtml(blockId)}"` : ''

  if (foldable) {
    const isOpen = foldable === 'open'
    return (
      `<details class="${cls}" data-callout="${type}"${idAttr}${isOpen ? ' open' : ''}>` +
      `<summary class="callout-title">${iconSvg}<span class="callout-title-text">${titleHtml}</span></summary>` +
      `<div class="callout-content">${bodyHtml}</div>` +
      `</details>`
    )
  }

  return (
    `<div class="${cls}" data-callout="${type}"${idAttr}>` +
    `<div class="callout-title">${iconSvg}<span class="callout-title-text">${titleHtml}</span></div>` +
    `<div class="callout-content">${bodyHtml}</div>` +
    `</div>`
  )
}

// 防 unused
export type { CalloutCanonical, AllYouNeedEnv }
