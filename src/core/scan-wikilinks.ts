/**
 * v0.3 — 启动时预扫所有 .md,找出死 wikilink,集中 console.warn 一次。
 *
 * 不影响渲染管线(渲染时 wikilink rule 自己也有 dead-link 检测+报警)。
 * 这个函数只是给开发者一个"启动总览",避免要 dev-server 打开每页才看到死链。
 */

import type { ResolvedOptions, VaultIndex } from './types.js'
import { stripMarkdownExt, toPosix } from '../utils/path.js'

const WIKILINK_RE = /(!?)\[\[([^\]\n|#]+)(?:#[^\]\n|]*)?(?:\|[^\]\n]*)?\]\]/g

export interface DeadLinkReport {
  /** 总扫描的 wikilink 数 */
  total: number
  /** 死链(target 解析不到的)*/
  dead: Array<{ source: string; target: string; raw: string }>
}

/**
 * 把 fenced code block / inline code 全部抹掉成空白(保留长度,不破坏行号),
 * 这样后续 wikilink regex 不会扫到代码示例里的 `[[note]]`(它们渲染时也不会
 * 被 markdown-it 当 wikilink,因此不该报死链)。
 */
function stripCodeForScan(src: string): string {
  // ``` fenced ```
  let r = src.replace(/```[\s\S]*?```/g, (m) => ' '.repeat(m.length))
  // ~~~ fenced ~~~
  r = r.replace(/~~~[\s\S]*?~~~/g, (m) => ' '.repeat(m.length))
  // 行内 code(支持多个反引号,简化:同数量反引号配对)
  r = r.replace(/(`+)(?:(?!\1)[\s\S])*?\1/g, (m) => ' '.repeat(m.length))
  return r
}

export function scanWikilinks(
  index: VaultIndex,
  options: ResolvedOptions,
): DeadLinkReport {
  const dead: DeadLinkReport['dead'] = []
  let total = 0

  for (const f of index.files.values()) {
    const cleaned = stripCodeForScan(f.content)
    const matches = cleaned.matchAll(WIKILINK_RE)
    for (const m of matches) {
      total += 1
      const isEmbed = m[1] === '!'
      const rawTarget = m[2]!.trim()
      // image/audio/video/pdf/transclusion 走 embed 通道,不参与 wikilink 死链检测
      if (isEmbed) {
        const ext = extractExt(rawTarget)
        if (ext) {
          const isAsset =
            options.scan.assetExtensions.includes(ext.toLowerCase()) ||
            ['md', 'markdown'].includes(ext.toLowerCase())
          if (isAsset) continue
        }
      }
      const found = resolveSimple(rawTarget, index, options, f.relativePath)
      if (!found) {
        dead.push({
          source: f.relativePath,
          target: rawTarget,
          raw: `${isEmbed ? '!' : ''}[[${rawTarget}]]`,
        })
      }
    }
  }
  return { total, dead }
}

/** vitepress.ts wrapper 用:扫完打印汇总 */
export function logDeadLinks(report: DeadLinkReport, deadLink: 'silent' | 'warn' | 'error'): void {
  if (report.dead.length === 0) return
  if (deadLink === 'silent') return
  const head = `vitepress-allyouneed: 共扫描 ${report.total} 个 wikilink, ` +
    `发现 ${report.dead.length} 个死链:`
  if (deadLink === 'error') {
    console.error(head)
  } else {
    console.warn(head)
  }
  // 按 source 分组打印,便于人眼看
  const bySource = new Map<string, typeof report.dead>()
  for (const d of report.dead) {
    const arr = bySource.get(d.source) ?? []
    arr.push(d)
    bySource.set(d.source, arr)
  }
  for (const [src, items] of [...bySource.entries()].sort()) {
    console.warn(`  ${src}`)
    for (const it of items) {
      console.warn(`    ${it.raw}`)
    }
  }
}

function extractExt(target: string): string {
  const cleaned = target.split('#')[0]!
  const dot = cleaned.lastIndexOf('.')
  if (dot <= 0) return ''
  return cleaned.slice(dot + 1).toLowerCase()
}

function resolveSimple(
  raw: string,
  index: VaultIndex,
  options: ResolvedOptions,
  currentSourceRel?: string,
): boolean {
  const target = stripMarkdownExt(toPosix(raw))
  if (!target) return false
  // 路径形式
  if (target.includes('/')) {
    if (
      index.byRelativePath.has(target) ||
      index.byRelativePath.has(target + '.md') ||
      index.byRelativePath.has(target + '.markdown')
    ) {
      return true
    }
    // Fallback:相对当前源文件目录
    if (currentSourceRel) {
      const curDir = currentSourceRel.split('/').slice(0, -1).join('/')
      if (curDir) {
        return (
          index.byRelativePath.has(`${curDir}/${target}`) ||
          index.byRelativePath.has(`${curDir}/${target}.md`) ||
          index.byRelativePath.has(`${curDir}/${target}.markdown`)
        )
      }
    }
    return false
  }
  // alias
  const aliasKey = options.caseSensitive ? target : target.toLowerCase()
  if (index.byAlias.has(aliasKey)) return true
  // basename
  const map = options.caseSensitive ? index.byBasename : index.byBasenameLower
  const key = options.caseSensitive ? target : target.toLowerCase()
  return (map.get(key)?.length ?? 0) > 0
}
