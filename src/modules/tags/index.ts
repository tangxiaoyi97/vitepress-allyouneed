/**
 * tags 模块入口。v0.2 加入,负责正文 #tag 识别。
 *
 * frontmatter `tags:` 字段在 v0.1 就已经被 VaultScanner 收集进 FileEntry.tags,
 * 这里只处理"正文 #tag"。两者最终在 generate-data.ts 合并。
 */

import type MarkdownIt from 'markdown-it'
import { registerTagsInline } from './rule.js'

export { registerTagsInline }

/** 标准 register 形式 */
export function registerTags(md: MarkdownIt): void {
  registerTagsInline(md)
}
