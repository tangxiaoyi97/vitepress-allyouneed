/**
 * wikilinks 渲染辅助 —— 把解析结果落成 markdown-it tokens。
 */

import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs'
import type {
  ResolveResult,
  AllYouNeedEnv,
  PageLinkAttrs,
  PageLinkAttrsContext,
} from '../../core/types.js'

/**
 * 渲染正常 wikilink(`[[Page]]`、`[[Page|alias]]`、`[[Page#heading]]`)。
 */
export function renderPageLink(
  state: StateInline,
  result: ResolveResult,
  label: string,
  env: AllYouNeedEnv,
): boolean {
  const open = state.push('link_open', 'a', 1)
  const classes = ['wikilink']
  if (result.hasUnmatchedAnchor) classes.push('wikilink--unmatched-anchor')

  const baseAttrs: Record<string, string> = {
    href: result.url,
    class: classes.join(' '),
    'data-wikilink-target': result.target
      ? result.target.relativePath
      : '',
  }

  const extra = resolveExtraAttrs(env.options.wikilinks.htmlAttributes, {
    originalHref: result.url,
    label,
    target: result.target,
    isDead: result.isDead,
    hasUnmatchedAnchor: result.hasUnmatchedAnchor,
  })

  applyAttrs(open, baseAttrs, extra)

  // label 渲染:默认走 text token(安全);allowLinkLabelFormatting=true 时
  // 走 inline 解析,但带递归保护。
  emitLabel(state, label, env)

  state.push('link_close', 'a', -1)
  return true
}

/**
 * 渲染死链:href 还是用原 raw 编码后的值,加 wikilink--dead class,
 * label 仍是 user-supplied 或 fallback,不抛错。
 */
export function renderDeadLink(
  state: StateInline,
  url: string,
  label: string,
  rawTarget: string,
  env: AllYouNeedEnv,
): boolean {
  const open = state.push('link_open', 'a', 1)
  const baseAttrs: Record<string, string> = {
    href: url,
    class: 'wikilink wikilink--dead',
    'data-wikilink-target': rawTarget,
    title: `死链:找不到 [[${rawTarget}]]`,
  }
  const extra = resolveExtraAttrs(env.options.wikilinks.htmlAttributes, {
    originalHref: url,
    label,
    target: undefined,
    isDead: true,
    hasUnmatchedAnchor: false,
  })
  applyAttrs(open, baseAttrs, extra)

  emitLabel(state, label, env)

  state.push('link_close', 'a', -1)
  return true
}

/**
 * 推 label 文本 token(或 inline 解析的结果)。
 */
function emitLabel(
  state: StateInline,
  label: string,
  env: AllYouNeedEnv,
): void {
  if (env.options.wikilinks.allowLinkLabelFormatting) {
    // 递归保护:env 上挂一个深度计数,超过 3 直接回退到 text
    const depth = (env as unknown as { _labelDepth?: number })._labelDepth ?? 0
    if (depth < 3) {
      ;(env as unknown as { _labelDepth?: number })._labelDepth = depth + 1
      const md = state.md
      const html = md.renderInline(label, env)
      const token = state.push('html_inline', '', 0)
      token.content = html
      ;(env as unknown as { _labelDepth?: number })._labelDepth = depth
      return
    }
  }
  const t = state.push('text', '', 0)
  t.content = label
}

/**
 * 合并用户 htmlAttributes(函数或对象)。
 */
function resolveExtraAttrs(
  htmlAttrs: PageLinkAttrs,
  ctx: PageLinkAttrsContext,
): Record<string, string> {
  if (typeof htmlAttrs === 'function') return htmlAttrs(ctx)
  return htmlAttrs ?? {}
}

/**
 * 把 base + extra 应用到 token,extra 中重复的 key 覆盖 base
 * (例外:class 做合并而非覆盖)。
 */
function applyAttrs(
  token: { attrSet(k: string, v: string): void },
  base: Record<string, string>,
  extra: Record<string, string>,
): void {
  const merged: Record<string, string> = { ...base }
  for (const [k, v] of Object.entries(extra)) {
    if (k === 'class' && merged.class) {
      merged.class = merged.class + ' ' + v
    } else {
      merged[k] = v
    }
  }
  for (const [k, v] of Object.entries(merged)) {
    token.attrSet(k, v)
  }
}
