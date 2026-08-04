/**
 * v0.3 — Pandoc 风格脚注。
 *
 * 支持的子集:
 *   - 引用:`text[^id]` → 上标 `<sup><a>1</a></sup>`,自增编号
 *   - 定义:行首 `[^id]: text...`,支持缩进续行与多段内容
 *   - Obsidian inline footnote:`^[content]`
 *   - 渲染:文末追加 `<section class="footnotes">`,每个 def 一个 `<li>`,
 *     带反向链接箭头 ↩ 回到引用处
 *
 * 实现:
 *   - block rule:扫到 `[^id]:` 起,把整行剩余文本当 def content,推一个
 *     私有 token 'footnote_def'(content=md inline 源),不影响主流
 *   - inline rule:扫到 `[^id]` 推 'footnote_ref' token,记 id + 占位 number
 *   - core rule(post 'inline'):收集所有 def + ref,按出现顺序编号,
 *     渲染 ref 用最终 number;在 tokens 末尾追加 footnotes section html_block
 *
 * 安全:
 *   - id 只允许 `[\w-]+`
 *   - 同 id 多次引用 → 共用编号,反链多个箭头
 *   - 引用了不存在的 id → 渲染成普通文本,不崩
 */

import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs'
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs'
import type StateCore from 'markdown-it/lib/rules_core/state_core.mjs'
import type MarkdownIt from 'markdown-it'
import type { AllYouNeedEnv } from '../../core/types.js'
import { escapeHtml } from '../../utils/escape.js'

/** 定义行:行首(允许 indent ≤3) `[^id]: rest`
 * 注:为简单起见 indent 必须 ≤3(markdown-it 默认 paragraph 阈值) */
const DEF_RE = /^\[\^([\w-]+)\]:\s*(.*)$/
/** 引用:`[^id]`,id 只允许 \w 和 - */
const REF_RE = /^\[\^([\w-]+)\]/

// ── block rule:抓 def ────────────────────────────────────────────

function defBlockRule(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
): boolean {
  const start = state.bMarks[startLine]! + state.tShift[startLine]!
  const max = state.eMarks[startLine]!
  const tShift = state.tShift[startLine]!
  if (tShift > 3) return false
  const line = state.src.slice(start, max)
  const m = DEF_RE.exec(line)
  if (!m) return false
  if (silent) return true

  const id = m[1]!
  const contentLines = [(m[2] ?? '').trimEnd()]
  let nextLine = startLine + 1
  while (nextLine < endLine) {
    const raw = sourceLine(state, nextLine)
    if (raw.trim() === '') {
      let lookahead = nextLine + 1
      while (lookahead < endLine && sourceLine(state, lookahead).trim() === '') {
        lookahead += 1
      }
      if (lookahead >= endLine || !isFootnoteContinuation(sourceLine(state, lookahead))) {
        break
      }
      while (nextLine < lookahead) {
        contentLines.push('')
        nextLine += 1
      }
      continue
    }
    if (!isFootnoteContinuation(raw)) break
    contentLines.push(stripContinuationIndent(raw))
    nextLine += 1
  }
  const content = contentLines.join('\n').trim()

  const token = state.push('footnote_def', '', 0)
  token.meta = { id, content, multiline: contentLines.length > 1 }
  token.map = [startLine, nextLine]
  token.hidden = true // 不直接渲染,等 core rule 收集

  state.line = nextLine
  return true
}

function sourceLine(state: StateBlock, line: number): string {
  return state.src.slice(
    state.bMarks[line]!,
    state.eMarks[line]!,
  )
}

function isFootnoteContinuation(line: string): boolean {
  return /^(?: {2,}|\t)/.test(line)
}

function stripContinuationIndent(line: string): string {
  return line.startsWith('\t') ? line.slice(1) : line.replace(/^ {2,4}/, '')
}

// ── inline rule:抓 ref ──────────────────────────────────────────

function refInlineRule(state: StateInline, silent: boolean): boolean {
  const start = state.pos
  if (state.src.charCodeAt(start) !== 0x5b /* [ */) return false

  // `^[inline footnote]`:markdown-it's text rule has already consumed the
  // caret by the time parsing reaches `[`, so remove that trailing caret from
  // the previous text token when emitting the custom ref token.
  if (
    start > 0 &&
    state.src.charCodeAt(start - 1) === 0x5e /* ^ */ &&
    !isEscaped(state.src, start - 1)
  ) {
    const close = findInlineFootnoteClose(state.src, start + 1, state.posMax)
    if (close < 0) return false
    const content = state.src.slice(start + 1, close).trim()
    if (!content) return false
    if (silent) {
      state.pos = close + 1
      return true
    }
    removeTrailingCaret(state)
    const token = state.push('footnote_ref', '', 0)
    token.meta = { inlineContent: content }
    state.pos = close + 1
    return true
  }

  if (state.src.charCodeAt(start + 1) !== 0x5e /* ^ */) return false
  const slice = state.src.slice(start)
  const m = REF_RE.exec(slice)
  if (!m) return false
  // markdown-it 会在解析链接 label 等嵌套结构时用 silent 模式
  // 调用 inline rule。命中规则即使不产生 token 也必须消耗输入，
  // 否则 skipToken 会抛出 "inline rule didn't increment state.pos"。
  if (silent) {
    state.pos = start + m[0].length
    return true
  }

  const id = m[1]!
  const token = state.push('footnote_ref', '', 0)
  token.meta = { id }
  state.pos = start + m[0].length
  return true
}

function findInlineFootnoteClose(source: string, start: number, max: number): number {
  let nestedBrackets = 0
  for (let i = start; i < max; i += 1) {
    if (source[i] === '\n') return -1
    if (isEscaped(source, i)) continue
    if (source[i] === '[') nestedBrackets += 1
    if (source[i] === ']') {
      if (nestedBrackets === 0) return i
      nestedBrackets -= 1
    }
  }
  return -1
}

function isEscaped(source: string, index: number): boolean {
  let slashes = 0
  for (let i = index - 1; i >= 0 && source[i] === '\\'; i -= 1) slashes += 1
  return slashes % 2 === 1
}

function removeTrailingCaret(state: StateInline): void {
  const previous = state.tokens[state.tokens.length - 1]
  if (previous?.type !== 'text' || !previous.content.endsWith('^')) return
  previous.content = previous.content.slice(0, -1)
  if (!previous.content) state.tokens.pop()
}

// ── core rule:收集 + 编号 + 渲染 section ────────────────────────

interface DefRecord {
  id: string
  content: string
  number: number
  /** 这条 def 被哪几个 ref 引用,ref index → ref-token-anchor-id */
  refAnchors: string[]
  multiline: boolean
}

function collectAndRender(state: StateCore): boolean {
  const tokens = state.tokens
  // 收集所有 def
  const defs = new Map<string, DefRecord>()
  // 把 ref 按出现顺序编号(只在 def 存在时分配编号;不存在保留 token,后面 render 兜底)
  let refSeq = 0
  let inlineSeq = 0
  let nextNumber = 1

  // pass 1:收集 def(不渲染顺序无关,只需要 content)
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!
    if (t.type !== 'footnote_def') continue
    const meta = t.meta as { id: string; content: string; multiline?: boolean }
    if (!defs.has(meta.id)) {
      defs.set(meta.id, {
        id: meta.id,
        content: meta.content,
        number: -1, // 在 ref 第一次遇到时分配
        refAnchors: [],
        multiline: meta.multiline === true,
      })
    }
    // 把这个 def token 标记为完全空(等 core 渲染替换)
    t.type = 'html_block'
    t.content = ''
    t.hidden = true
  }

  // pass 2:扫所有 inline children,把 footnote_ref 改写为 html_inline
  for (const t of tokens) {
    if (t.type !== 'inline' || !t.children) continue
    for (let j = 0; j < t.children.length; j++) {
      const c = t.children[j]!
      if (c.type !== 'footnote_ref') continue
      const meta = c.meta as { id?: string; inlineContent?: string }
      const inlineId = meta.inlineContent === undefined
        ? undefined
        : `inline-${++inlineSeq}`
      const rec = inlineId
        ? {
            id: inlineId,
            content: meta.inlineContent!,
            number: -1,
            refAnchors: [],
            multiline: false,
          }
        : defs.get(meta.id!)
      if (inlineId && rec) defs.set(inlineId, rec)
      if (!rec) {
        // 没找到 def:降级成原始文本 `[^id]`
        c.type = 'text'
        c.content = meta.id ? `[^${meta.id}]` : `^[${meta.inlineContent ?? ''}]`
        c.meta = null
        continue
      }
      if (rec.number === -1) rec.number = nextNumber++
      const anchorId = `fnref-${escapeHtmlAttr(rec.id)}-${++refSeq}`
      rec.refAnchors.push(anchorId)

      c.type = 'html_inline'
      c.content =
        `<sup class="ayn-footnote-ref" id="${anchorId}">` +
        `<a href="#fn-${escapeHtmlAttr(rec.id)}" data-footnote-ref>` +
        `[${rec.number}]` +
        `</a></sup>`
      c.meta = null
    }
  }

  // pass 3:把所有用到的 def(rec.number !== -1)按 number 排序后追加 section
  const used = Array.from(defs.values())
    .filter((d) => d.number !== -1)
    .sort((a, b) => a.number - b.number)

  if (used.length === 0) return false

  let html = '<section class="ayn-footnotes"><hr><ol class="ayn-footnotes-list">'
  for (const rec of used) {
    const renderedContent = renderFootnoteContent(state, rec)
    const backlinks = rec.refAnchors
      .map(
        (anchor, idx) =>
          `<a class="ayn-footnote-backref" href="#${anchor}" ` +
          `data-footnote-backref aria-label="Back to reference ${rec.number}-${idx + 1}">` +
          // U+2191 ↑ (UPWARDS ARROW),不是 emoji 字符;CSS font-family 强制
          // 非 emoji 字体保证显示一致(见 shared.css)
          `↑` +
          `</a>`,
      )
      .join(' ')
    html +=
      `<li id="fn-${escapeHtmlAttr(rec.id)}" class="ayn-footnote-item">` +
      `${rec.multiline ? '<div' : '<span'} class="ayn-footnote-content">` +
      `${renderedContent}${rec.multiline ? '</div>' : '</span>'} ` +
      backlinks +
      `</li>`
  }
  html += '</ol></section>'

  const tail = new state.Token('html_block', '', 0)
  tail.content = html + '\n'
  tokens.push(tail)

  return false
}

function renderFootnoteContent(state: StateCore, record: DefRecord): string {
  if (!record.multiline) return state.md.renderInline(record.content, state.env)
  const parent = state.env as Partial<AllYouNeedEnv> | undefined
  const childEnv: Record<string, unknown> = {}
  if (parent?.index && parent.options) {
    Object.assign(childEnv, {
      index: parent.index,
      options: parent.options,
      currentPath: parent.currentPath,
      referencedAssets: parent.referencedAssets,
    })
    const tags = (parent as AllYouNeedEnv & { referencedTags?: Set<string> })
      .referencedTags
    if (tags) childEnv.referencedTags = tags
  }
  return state.md.render(record.content, childEnv).trim()
}

function escapeHtmlAttr(s: string): string {
  // id 只允许 \w-,但还是过一次 escapeHtml 防意外
  return escapeHtml(s)
}

// ── 注册 ────────────────────────────────────────────────────────

export function registerFootnotes(md: MarkdownIt): void {
  md.block.ruler.before('reference', 'allyouneed_footnote_def', defBlockRule, {
    alt: ['paragraph', 'reference'],
  })
  md.inline.ruler.after('emphasis', 'allyouneed_footnote_ref', refInlineRule)
  md.core.ruler.after('inline', 'allyouneed_footnote_collect', collectAndRender)
}
