/**
 * 锚点 slugifier。
 *
 * 默认用 @mdit-vue/shared 的 slugify —— 这是 VitePress 内部 markdown-it-anchor
 * 默认使用的实现,保证我们算出的 slug 和 anchor ID 100% 对得上(包括中文)。
 *
 * 用户在 VitePress 里覆写了 markdown.anchor.slugify 时,ConfigBridge 会把
 * 用户的函数读出来传给 ResolvedOptions.slugify,Resolver 直接用,无需走这里。
 */

import { slugify as mditVueSlugify } from '@mdit-vue/shared'

/**
 * 默认 slugifier。
 */
export function defaultSlugify(text: string): string {
  return mditVueSlugify(text)
}

/**
 * 处理 `## 标题 {#custom-id}` 这种自定义 anchor 语法,
 * 返回 `{ text: '标题', slug: 'custom-id' | undefined }`。
 *
 * markdown-it-anchor 默认启用此扩展(`permalink.linkInsideHeader` 等无关),
 * 我们的 heading 收集器要做相同识别,否则 [[Page#标题]] 会按 slugify('标题')
 * 算,而 markdown-it-anchor 实际用了 'custom-id',结果不匹配。
 */
const CUSTOM_ID_RE = /\s*\{#([^}\s]+)\}\s*$/

export function extractCustomId(headingText: string): {
  text: string
  customId: string | undefined
} {
  const m = headingText.match(CUSTOM_ID_RE)
  if (!m) return { text: headingText, customId: undefined }
  return {
    text: headingText.replace(CUSTOM_ID_RE, ''),
    customId: m[1],
  }
}
