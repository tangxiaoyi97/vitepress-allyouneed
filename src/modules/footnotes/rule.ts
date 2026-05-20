/**
 * v0.3 — Pandoc 风格脚注。
 *
 * 支持的子集:
 *   - 引用:`text[^id]` → 上标 `<sup><a>1</a></sup>`,自增编号
 *   - 定义:行首 `[^id]: text...`(单行,**不支持**多段缩进续行 —— 留到 v0.4)
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
  const content = (m[2] ?? '').trim()

  const token = state.push('footnote_def', '', 0)
  token.meta = { id, content }
  token.map = [startLine, startLine + 1]
  token.hidden = true // 不直接渲染,等 core rule 收集

  state.line = startLine + 1
  // 防 endLine unused
  void endLine
  return true
}

// ── inline rule:抓 ref ──────────────────────────────────────────

function refInlineRule(state: StateInline, silent: boolean): boolean {
  const start = state.pos
  if (state.src.charCodeAt(start) !== 0x5b /* [ */) return false
  if (state.src.charCodeAt(start + 1) !== 0x5e /* ^ */) return false
  const slice = state.src.slice(start)
  const m = REF_RE.exec(slice)
  if (!m) return false
  if (silent) return true

  const id = m[1]!
  const token = state.push('footnote_ref', '', 0)
  token.meta = { id }
  state.pos = start + m[0].length
  return true
}

// ── core rule:收集 + 编号 + 渲染 section ────────────────────────

interface DefRecord {
  id: string
  content: string
  number: number
  /** 这条 def 被哪几个 ref 引用,ref index → ref-token-anchor-id */
  refAnchors: string[]
}

function collectAndRender(state: StateCore): boolean {
  const tokens = state.tokens
  // 收集所有 def
  const defs = new Map<string, DefRecord>()
  // 把 ref 按出现顺序编号(只在 def 存在时分配编号;不存在保留 token,后面 render 兜底)
  let refSeq = 0
  let nextNumber = 1

  // pass 1:收集 def(不渲染顺序无关,只需要 content)
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!
    if (t.type !== 'footnote_def') continue
    const meta = t.meta as { id: string; content: string }
    if (!defs.has(meta.id)) {
      defs.set(meta.id, {
        id: meta.id,
        content: meta.content,
        number: -1, // 在 ref 第一次遇到时分配
        refAnchors: [],
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
      const meta = c.meta as { id: string }
      const rec = defs.get(meta.id)
      if (!rec) {
        // 没找到 def:降级成原始文本 `[^id]`
        c.type = 'text'
        c.content = `[^${meta.id}]`
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
    const renderedContent = state.md.renderInline(rec.content, state.env)
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
      `<span class="ayn-footnote-content">${renderedContent}</span> ` +
      backlinks +
      `</li>`
  }
  html += '</ol></section>'

  const tail = new state.Token('html_block', '', 0)
  tail.content = html + '\n'
  tokens.push(tail)

  return false
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
