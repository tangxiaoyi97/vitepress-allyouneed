/**
 * v0.3 — Obsidian 注释 `%%comment%%` 语法。
 *
 * 行为:
 *   - inline `%%...%%`:静默吃掉,不渲染任何内容
 *   - block 形式:整段都被 `%%` 包起来(可能跨多行)
 *     ```
 *     %%
 *     multi-line comment
 *     %%
 *     ```
 *     整块从 token 流移除
 *
 * 实现:
 *   - inline rule:碰到 `%%` 找到下一个 `%%`(可跨行?Obsidian 实际只在同段内匹配),
 *     吃掉,不 push token
 *   - block rule:行首是 `%%`,扫到下一行的 `%%`(独占一行),整段当注释吃掉
 */

import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs'
import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs'
import type MarkdownIt from 'markdown-it'

const PCT = 0x25 // '%'

export function makeCommentInlineRule(): (
  state: StateInline,
  silent: boolean,
) => boolean {
  return function commentInline(state, silent): boolean {
    const start = state.pos
    const max = state.posMax
    if (start + 4 > max) return false
    if (state.src.charCodeAt(start) !== PCT) return false
    if (state.src.charCodeAt(start + 1) !== PCT) return false

    // 找下一个 `%%`,允许换行(Obsidian 行内注释可跨行)
    let pos = start + 2
    let found = -1
    while (pos < max - 1) {
      if (
        state.src.charCodeAt(pos) === PCT &&
        state.src.charCodeAt(pos + 1) === PCT
      ) {
        found = pos
        break
      }
      pos += 1
    }

    if (found < 0) return false
    if (silent) return true

    // 吃掉,不 push 任何 token
    state.pos = found + 2
    return true
  }
}

/**
 * block-level comment:`%%` 单独成行(允许尾随空格)起,
 * 下一个 `%%` 单独成行止,整段吃掉。
 *
 * 注意:markdown-it 的 block rule 接口要返回 true 表示"消耗了若干行"。
 */
export function makeCommentBlockRule(): (
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
) => boolean {
  return function commentBlock(state, startLine, endLine, silent): boolean {
    const pos = state.bMarks[startLine]! + state.tShift[startLine]!
    const max = state.eMarks[startLine]!
    // 必须以 `%%` 开头
    if (pos + 2 > max) return false
    if (state.src.charCodeAt(pos) !== PCT) return false
    if (state.src.charCodeAt(pos + 1) !== PCT) return false
    // 这一行 `%%` 之后必须只剩空白(才算独占一行 fence)
    const restStart = pos + 2
    const rest = state.src.slice(restStart, max)
    if (rest.trim() !== '') return false

    if (silent) return true

    // 找闭合:下一行起,寻找以 `%%` 独占的一行
    let next = startLine + 1
    let closed = false
    while (next < endLine) {
      const lpos = state.bMarks[next]! + state.tShift[next]!
      const lmax = state.eMarks[next]!
      if (
        lpos + 2 <= lmax &&
        state.src.charCodeAt(lpos) === PCT &&
        state.src.charCodeAt(lpos + 1) === PCT &&
        state.src.slice(lpos + 2, lmax).trim() === ''
      ) {
        closed = true
        break
      }
      next += 1
    }

    // 没找到闭合就吃到 endLine
    const lastLine = closed ? next + 1 : next
    state.line = lastLine
    return true
  }
}

export function registerCommentsInline(md: MarkdownIt): void {
  // 放在 highlight 之前,避免 `%%` 被高亮规则误判(highlight 看 `==` 不会冲突,
  // 但越早跑越简单)
  md.inline.ruler.before(
    'emphasis',
    'allyouneed_comment_inline',
    makeCommentInlineRule(),
  )
}

export function registerCommentsBlock(md: MarkdownIt): void {
  md.block.ruler.before(
    'fence',
    'allyouneed_comment_block',
    makeCommentBlockRule(),
    { alt: [] },
  )
}
