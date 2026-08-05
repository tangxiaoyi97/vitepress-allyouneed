/**
 * frontmatter 解析。
 *
 * 用 gray-matter,Obsidian 和 Astro 都用它,YAML 兼容性好。
 * 解析失败时返回空 frontmatter + 原文,落 warning。
 */

import matter from 'gray-matter'
import { displayTag, isValidTag, normalizeTag } from '../tags.js'

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
  return normalizeTagEntries(raw).map((entry) => entry.tag)
}

/** Canonical tag keys paired with first spelling in this frontmatter value. */
export function normalizeTagEntries(
  raw: unknown,
): Array<{ tag: string; display: string }> {
  if (raw == null) return []
  const values = typeof raw === 'string'
    ? raw.split(/[,\s]+/)
    : Array.isArray(raw)
      ? raw.filter((value): value is string => typeof value === 'string')
      : []
  const seen = new Set<string>()
  const result: Array<{ tag: string; display: string }> = []
  for (const value of values) {
    const tag = normalizeTag(value)
    if (!isValidTag(tag) || seen.has(tag)) continue
    seen.add(tag)
    result.push({ tag, display: displayTag(value) })
  }
  return result
}
