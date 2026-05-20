/**
 * v0.3 — Obsidian block-ref marker `^block-id`。
 *
 * 行为(渲染层简化版):
 *   - 段落中或独立行末尾的 `^id` 被识别,从渲染文本中**剥除**
 *   - 在所在 block(paragraph / heading / li / blockquote 等)的 open token 上
 *     附 `id="^block-id"` 属性,作 DOM 锚点
 *   - 用户可以通过 `<page>#^block-id` 直接跳转(浏览器原生 anchor scroll)
 *
 * 不在此版本做:
 *   - VaultIndex 层登记 block-id(让 `[[note#^id]]` 走 resolver 跳转)
 *     这块需要碰 vault scanner,留到 v0.4
 *
 * 实现:
 *   - core ruler(after 'inline'):扫所有 inline token,找 `^id`(末尾或前空白),
 *     从 content / children 中剥掉,把 id 写到前一个 open token 的 attrs
 */

import type StateCore from 'markdown-it/lib/rules_core/state_core.mjs'
import type Token from 'markdown-it/lib/token.mjs'
import type MarkdownIt from 'markdown-it'

/** 末尾形式:`...\s^id` 或 `^id`(独占)*/
const BLOCK_ID_TAIL_RE = /(?:^|\s)\^([A-Za-z0-9_-]+)\s*$/

function blockRefsRule(state: StateCore): boolean {
  const tokens = state.tokens
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!
    if (t.type !== 'inline' || !t.children || t.children.length === 0) continue

    // 拼 inline 末尾文本(只看最后一个 text token,够覆盖 95% 用例)
    const lastIdx = findLastTextIdx(t.children)
    if (lastIdx < 0) continue
    const lastText = t.children[lastIdx]!
    const m = BLOCK_ID_TAIL_RE.exec(lastText.content)
    if (!m) continue

    const id = m[1]!
    // 从 text 末尾剥掉(留下前置空白也一起去掉)
    const matchedAt = lastText.content.length - m[0].length
    lastText.content = lastText.content.slice(0, matchedAt).replace(/\s+$/, '')

    // 同步 inline.content(否则后续渲染可能误用旧 content)
    t.content = t.content.replace(BLOCK_ID_TAIL_RE, '').replace(/\s+$/, '')

    // 把 id 加到上一个 *_open token(paragraph_open / heading_open / li_open ...)
    const opener = findPreviousOpen(tokens, i)
    if (opener) {
      addAttr(opener, 'id', `^${id}`)
      addClass(opener, 'ayn-block-anchor')
    }

    // 若剥完之后 last text 空了,把它移除(避免空 text 影响布局)
    if (lastText.content === '') {
      t.children.splice(lastIdx, 1)
    }
  }
  return false
}

function findLastTextIdx(children: Token[]): number {
  for (let i = children.length - 1; i >= 0; i--) {
    if (children[i]!.type === 'text') return i
  }
  return -1
}

function findPreviousOpen(tokens: Token[], inlineIdx: number): Token | null {
  for (let i = inlineIdx - 1; i >= 0; i--) {
    const t = tokens[i]!
    if (t.nesting === 1) return t
  }
  return null
}

function addAttr(token: Token, name: string, value: string): void {
  const existing = token.attrIndex(name)
  if (existing >= 0) {
    token.attrs![existing]![1] = value
  } else {
    token.attrPush([name, value])
  }
}

function addClass(token: Token, cls: string): void {
  const idx = token.attrIndex('class')
  if (idx >= 0) {
    const cur = token.attrs![idx]![1] ?? ''
    if (!cur.split(/\s+/).includes(cls)) {
      token.attrs![idx]![1] = (cur + ' ' + cls).trim()
    }
  } else {
    token.attrPush(['class', cls])
  }
}

export function registerBlockRefs(md: MarkdownIt): void {
  md.core.ruler.after('inline', 'allyouneed_block_refs', blockRefsRule)
}
