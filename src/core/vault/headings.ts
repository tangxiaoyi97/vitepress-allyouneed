/**
 * Heading 收集。
 *
 * 不引入完整 markdown-it 单纯为了收 heading —— 自己用正则扫,够快、零依赖。
 * 处理 ATX 风格(# / ## / ###),不处理 Setext(`===` / `---` 下划线风格,
 * Obsidian / VitePress 实际都极少用)。
 *
 * 识别 `{#custom-id}` 自定义 anchor 语法。
 */

import type { HeadingEntry } from '../types.js'
import { extractCustomId } from '../slugify.js'

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*$/
const FENCE_RE = /^(`{3,}|~{3,})/

/**
 * 从源文件正文(去掉 frontmatter 之后)收集 heading。
 *
 * @param content 正文
 * @param slugify 与 VitePress 一致的 slug 函数
 */
export function collectHeadings(
  content: string,
  slugify: (text: string) => string,
): HeadingEntry[] {
  const lines = content.split(/\r?\n/)
  const out: HeadingEntry[] = []

  let inFence = false
  let fenceMarker = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!

    // 跳过代码块内部
    const fenceMatch = line.match(FENCE_RE)
    if (fenceMatch) {
      if (!inFence) {
        inFence = true
        fenceMarker = fenceMatch[1]!
      } else if (line.startsWith(fenceMarker)) {
        inFence = false
        fenceMarker = ''
      }
      continue
    }
    if (inFence) continue

    const m = line.match(HEADING_RE)
    if (!m) continue

    const level = m[1]!.length
    const rawText = m[2]!
    const { text, customId } = extractCustomId(rawText)
    const slug = customId ?? slugify(text)

    out.push({ level, text, slug, line: i })
  }

  return out
}
