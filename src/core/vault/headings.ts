/**
 * Heading 收集。
 *
 * 使用 markdown-it 的 block/inline token,与 VitePress anchor 插件看到的
 * heading 文本保持一致（包括 Setext、inline Markdown 与 code spans）。
 */

import type { HeadingEntry } from '../types.js'
import { extractCustomId } from '../slugify.js'
import MarkdownIt from 'markdown-it'

const headingParser = new MarkdownIt({ html: true })

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
  const out: HeadingEntry[] = []
  const usedSlugs = new Set<string>()
  const tokens = headingParser.parse(content, {})

  for (let i = 0; i < tokens.length - 1; i++) {
    const open = tokens[i]!
    if (open.type !== 'heading_open') continue
    const inline = tokens[i + 1]!
    if (inline.type !== 'inline') continue

    const rawText = (inline.children ?? [])
      .filter((token) => token.type === 'text' || token.type === 'code_inline')
      .map((token) => token.content)
      .join('')
    const { text, customId } = extractCustomId(rawText)
    const baseSlug = customId ?? slugify(text)
    let uniqueSlug = baseSlug
    let suffix = 1
    while (usedSlugs.has(uniqueSlug)) {
      uniqueSlug = `${baseSlug}-${suffix++}`
    }
    usedSlugs.add(uniqueSlug)

    out.push({
      level: Number(open.tag.slice(1)),
      text,
      slug: uniqueSlug,
      line: open.map?.[0] ?? 0,
    })
  }

  return out
}
