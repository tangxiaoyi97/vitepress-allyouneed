/**
 * v0.3 — Obsidian `==text==` 高亮 inline rule。
 *
 * 渲染为 `<mark>text</mark>`,内部 markdown 继续解析(支持 `==**bold**==`)。
 *
 * 直接照搬 markdown-it-mark 的 tokenize + postProcess 双阶段方案:
 *   - tokenize:遇 `=`,统计连续个数 N;每 2 个 `=` 推一个 text token 进
 *     state.tokens,并往 state.delimiters 注一项 {marker: 0x3D, ...}
 *   - 中间内容由 markdown-it 后续 inline rule 继续 tokenize
 *   - balance_pairs 自动配对所有 delimiter(对 marker 不挑剔)
 *   - postProcess:扫 delimiters 找到 marker===0x3D 且 end!==-1 的,把
 *     对应 text token 改写为 mark_open / mark_close
 */

import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs'
import type Token from 'markdown-it/lib/token.mjs'
import type MarkdownIt from 'markdown-it'

const EQ = 0x3d /* = */

function tokenize(state: StateInline, silent: boolean): boolean {
  if (silent) return false
  const start = state.pos
  const marker = state.src.charCodeAt(start)
  if (marker !== EQ) return false

  const scanned = state.scanDelims(state.pos, true)
  let len = scanned.length
  const ch = String.fromCharCode(marker)

  if (len < 2) return false

  // 奇数个 `=`:把第一个当普通文本
  let token: Token
  if (len % 2) {
    token = state.push('text', '', 0)
    token.content = ch
    len -= 1
  }

  for (let i = 0; i < len; i += 2) {
    token = state.push('text', '', 0)
    token.content = ch + ch

    // state.delimiters 的类型 markdown-it 内部用,这里 cast 进去
    const delims = (state as unknown as { delimiters: unknown[] }).delimiters
    delims.push({
      marker,
      length: 0, // 关掉 emphasis 用的 "rule of 3"
      jump: i / 2, // 1 delimiter = 2 chars
      token: state.tokens.length - 1,
      end: -1,
      open: scanned.can_open,
      close: scanned.can_close,
    })
  }

  state.pos += scanned.length
  return true
}

interface DelimEntry {
  marker: number
  end: number
  token: number
}

function postProcess(state: StateInline): void {
  const delimiters = (state as unknown as { delimiters: DelimEntry[] })
    .delimiters
  const loneMarkers: number[] = []
  const max = delimiters.length

  for (let i = 0; i < max; i++) {
    const startDelim = delimiters[i]!
    if (startDelim.marker !== EQ) continue
    if (startDelim.end === -1) continue

    const endDelim = delimiters[startDelim.end]!

    let token: Token = state.tokens[startDelim.token]!
    token.type = 'mark_open'
    token.tag = 'mark'
    token.nesting = 1
    token.markup = '=='
    token.content = ''

    token = state.tokens[endDelim.token]!
    token.type = 'mark_close'
    token.tag = 'mark'
    token.nesting = -1
    token.markup = '=='
    token.content = ''

    const prev = state.tokens[endDelim.token - 1]
    if (prev && prev.type === 'text' && prev.content === '=') {
      loneMarkers.push(endDelim.token - 1)
    }
  }

  // 奇数残留 `=` 移到 close 后面,避免出现 `<mark>=</mark>x`
  while (loneMarkers.length > 0) {
    const i = loneMarkers.pop()!
    let j = i + 1
    while (
      j < state.tokens.length &&
      state.tokens[j]!.type === 'mark_close'
    ) {
      j += 1
    }
    j -= 1
    if (i !== j) {
      const tmp = state.tokens[j]!
      state.tokens[j] = state.tokens[i]!
      state.tokens[i] = tmp
    }
  }
}

export function registerHighlightInline(md: MarkdownIt): void {
  // 放在 emphasis 之前,确保 `==**x**==` 中 `==` 比 `*` 先被识别
  // 如果用户开了 markdown.math(`markdown-it-mathjax3` 注册了 math_inline),
  // 我们要排在它之后 —— 不然 `$...==...$` 公式里的 `==` 会被误吃。
  try {
    // 先尝试 'after math_inline';失败说明 math 没注册,退到 emphasis 之前
    md.inline.ruler.after('math_inline', 'allyouneed_highlight', tokenize)
  } catch {
    md.inline.ruler.before('emphasis', 'allyouneed_highlight', tokenize)
  }
  // postProcess 与 emphasis 同阶段 (ruler2),按 inline / sub-inline 两层都处理
  md.inline.ruler2.before(
    'emphasis',
    'allyouneed_highlight',
    function highlightPostProcess(state) {
      const tokens_meta = (
        state as unknown as { tokens_meta?: Array<{ delimiters?: DelimEntry[] } | null> }
      ).tokens_meta
      const curr = (state as unknown as { delimiters?: DelimEntry[] })
        .delimiters
      if (curr) postProcess(state)
      if (tokens_meta) {
        for (const m of tokens_meta) {
          if (m && m.delimiters) {
            const proxy = {
              ...state,
              delimiters: m.delimiters,
            } as unknown as StateInline
            postProcess(proxy)
          }
        }
      }
      return false
    },
  )
}
