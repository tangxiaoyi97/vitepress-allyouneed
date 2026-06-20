/**
 * Obsidian `==text==` highlight inline rule.
 *
 * `==` is not emphasis and must be allowed next to CJK text, bold markers,
 * links, and math. markdown-it's delimiter flanking rules are designed for
 * `*` / `_`; using them here made an opener such as `指==**重点**` invalid
 * because the next character is `*`, then paired the following markers across
 * unrelated text. Parse a complete marker pair atomically instead and run the
 * normal inline parser over its body so nested Markdown remains supported.
 */

import type MarkdownIt from 'markdown-it'
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs'
import type Token from 'markdown-it/lib/token.mjs'

const EQ = 0x3d /* = */
const BACKSLASH = 0x5c /* \\ */

function findClosingMarker(src: string, from: number): number {
  for (let pos = from; pos < src.length - 1; pos += 1) {
    if (src.charCodeAt(pos) === BACKSLASH) {
      pos += 1
      continue
    }
    if (src.charCodeAt(pos) === EQ && src.charCodeAt(pos + 1) === EQ) {
      return pos
    }
  }
  return -1
}

function tokenize(state: StateInline, silent: boolean): boolean {
  const start = state.pos
  if (
    state.src.charCodeAt(start) !== EQ ||
    state.src.charCodeAt(start + 1) !== EQ
  ) {
    return false
  }

  const close = findClosingMarker(state.src, start + 2)
  if (close < 0 || close === start + 2) return false

  const end = close + 2
  if (silent) {
    state.pos = end
    return true
  }

  const open = state.push('mark_open', 'mark', 1)
  open.markup = '=='

  const inner: Token[] = []
  state.md.inline.parse(
    state.src.slice(start + 2, close),
    state.md,
    state.env,
    inner,
  )
  const levelOffset = state.level
  for (const token of inner) {
    token.level += levelOffset
    state.tokens.push(token)
  }

  const closeToken = state.push('mark_close', 'mark', -1)
  closeToken.markup = '=='
  state.pos = end
  return true
}

export function registerHighlightInline(md: MarkdownIt): void {
  // Math must consume `$...$` first so equality signs inside formulas remain
  // untouched. Without a math plugin, register before emphasis as usual.
  try {
    md.inline.ruler.after('math_inline', 'allyouneed_highlight', tokenize)
  } catch {
    md.inline.ruler.before('emphasis', 'allyouneed_highlight', tokenize)
  }
}
