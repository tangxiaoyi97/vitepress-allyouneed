/**
 * frontmatter 解析。
 *
 * 用 gray-matter,Obsidian 和 Astro 都用它,YAML 兼容性好。
 * 解析失败时返回空 frontmatter + 原文,落 warning。
 */

import matter from 'gray-matter'
import { isValidTag, normalizeTag } from '../tags.js'

export interface ParsedFrontmatter {
  /** 解析后的 frontmatter 对象,失败时为空对象 */
  data: Record<string, unknown>
  /** 去掉 frontmatter 之后的正文 */
  content: string
  /** 解析错误信息,成功为 undefined */
  error?: string
}

export function parseFrontmatter(raw: string): ParsedFrontmatter {
  try {
    const { data, content } = matter(raw)
    return { data: (data ?? {}) as Record<string, unknown>, content }
  } catch (err) {
    return {
      data: {},
      content: raw,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * 把 frontmatter.aliases 归一化为字符串数组。支持:
 * - undefined / null → []
 * - string → [string]
 * - string[] → 原样过滤空字符串
 * - 其它 → []
 */
export function normalizeAliases(raw: unknown): string[] {
  if (raw == null) return []
  if (typeof raw === 'string') return raw.trim() ? [raw.trim()] : []
  if (Array.isArray(raw)) {
    return raw
      .filter((v): v is string => typeof v === 'string')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

/**
 * 把 frontmatter.tags 归一化为字符串数组(同上规则)。
 */
export function normalizeTags(raw: unknown): string[] {
  if (raw == null) return []
  if (typeof raw === 'string') {
    return [...new Set(raw
      .split(/[,\s]+/)
      .map(normalizeTag)
      .filter(isValidTag))]
  }
  if (Array.isArray(raw)) {
    return [...new Set(raw
      .filter((v): v is string => typeof v === 'string')
      .map(normalizeTag)
      .filter(isValidTag))]
  }
  return []
}
