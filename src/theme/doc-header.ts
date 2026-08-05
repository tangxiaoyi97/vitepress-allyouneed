/** DocHeader 不依赖 DOM/Vue 的 URL 与 frontmatter 归一化工具。 */

import type { AllyouneedThemeConfig, DocHeaderConfig } from './types.js'

export function resolveDocHeaderConfig(
  config: AllyouneedThemeConfig | undefined,
): Required<DocHeaderConfig> {
  const prefix = (config?.viewsUrlPrefix ?? '_perspectives_')
    .replace(/^\/+|\/+$/g, '')
  const tagsName = config?.viewsNames?.tags ?? 'tags'
  const generatedTagsUrl = '/' + [prefix, tagsName].filter(Boolean).join('/')

  return {
    enabled: true,
    hideH1: true,
    showDates: true,
    showTags: true,
    showWordCount: true,
    tagsViewUrl: generatedTagsUrl,
    wordsPerMinute: 300,
    ...(config?.docHeader ?? {}),
  }
}

export function isExternalUrl(value: string): boolean {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)
}

export function normalizeDocTags(value: unknown): string[] {
  const values = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : typeof value === 'string'
      ? value.split(/[,\s]+/)
      : []

  const result: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const display = value.trim().replace(/^#+/, '')
    const key = display.toLowerCase()
    if (!display || seen.has(key)) continue
    seen.add(key)
    result.push(display)
  }
  return result
}

/** 把站内路径归一化为可交给 VitePress `withBase` 的根绝对 URL。 */
export function toSitePath(value: string): string {
  return value.startsWith('/') ? value : '/' + value
}

/**
 * 相对 cover 以当前 Markdown 文件所在目录为基准。返回值若为站内资源
 * 一定以 `/` 开头,调用方再应用 VitePress base。
 */
export function resolveCoverPath(raw: string, relativePath: string): string {
  if (isExternalUrl(raw)) return raw

  const match = raw.replace(/\\/g, '/').match(/^([^?#]*)([?#].*)?$/)
  const pathname = match?.[1] ?? raw
  const suffix = match?.[2] ?? ''
  const segments = pathname.startsWith('/')
    ? []
    : relativePath.split('/').slice(0, -1).filter(Boolean)

  for (const segment of pathname.split('/')) {
    if (!segment || segment === '.') continue
    if (segment === '..') {
      segments.pop()
      continue
    }
    segments.push(segment)
  }

  const encodedPath = segments
    .map((segment) => {
      try {
        return encodeURIComponent(decodeURIComponent(segment))
      } catch {
        return encodeURIComponent(segment)
      }
    })
    .join('/')
  return '/' + encodedPath + suffix
}
