/**
 * v0.3 — 启动时预扫所有 .md,找出死 wikilink,集中 console.warn 一次。
 *
 * 不影响渲染管线(渲染时 wikilink rule 自己也有 dead-link 检测+报警)。
 * 这个函数只是给开发者一个"启动总览",避免要 dev-server 打开每页才看到死链。
 */

import type { ResolvedOptions, VaultIndex } from './types.js'
import { splitWikilinkInner } from '../utils/wikilink.js'
import {
  findAmbiguousLeadingNumberMatches,
  resolveAttachment,
  resolvePlainAttachment,
  resolveWikilink,
} from './resolver.js'
import { getScannableMarkdown, WIKILINK_SOURCE } from './markdown-content.js'
import { classifyMediaExt } from '../modules/embeds/media.js'

export interface DeadLinkReport {
  /** 总扫描的 wikilink 数 */
  total: number
  /** 死链(target 解析不到的)*/
  dead: Array<{ source: string; target: string; raw: string }>
  /**
   * v0.3.9:leading-number 模式下"歧义锚点"——`#7.2` 同时匹配多个 heading,
   * resolver 取第一个但用户可能没察觉。这里汇总,scanWikilinks 启动时 warn 一次。
   */
  ambiguous: Array<{
    source: string
    raw: string
    headingPart: string
    chosen: string
    others: string[]
  }>
}

export function scanWikilinks(
  index: VaultIndex,
  options: ResolvedOptions,
): DeadLinkReport {
  const dead: DeadLinkReport['dead'] = []
  const ambiguous: DeadLinkReport['ambiguous'] = []
  let total = 0
  // v0.3.9:仅 leading-number 模式才扫歧义(exact 不会;fuzzy 用户自己背锅)
  const anchorMode = options.wikilinks.anchorMatch ?? 'leading-number'
  const scanAmbig = anchorMode === 'leading-number'

  for (const f of index.files.values()) {
    const cleaned = getScannableMarkdown(f)
    const matches = cleaned.matchAll(new RegExp(WIKILINK_SOURCE))
    for (const m of matches) {
      const isEmbed = m[1] === '!'
      if (isEmbed ? !options.modules.embeds : !options.modules.wikilinks) continue
      total += 1
      // v0.3.4:拆 \| 转义,只看 target 段;再剥 #heading
      const inner = m[2]!
      const rawTargetFull = splitWikilinkInner(inner)[0] ?? ''
      const targetFull = isEmbed
        ? rawTargetFull
        : options.wikilinks.postProcessLinkTarget(rawTargetFull)
      const hashIdx = targetFull.indexOf('#')
      const headingPart = hashIdx >= 0 ? targetFull.slice(hashIdx + 1).trim() : ''
      const rawTarget = (hashIdx >= 0 ? targetFull.slice(0, hashIdx) : targetFull).trim()
      if (!rawTarget && !headingPart) continue
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
      if (!isEmbed) {
        const attachment = resolvePlainAttachment(
          targetFull,
          index,
          options,
          f.absolutePath,
        )
        if (attachment.isAttachment) {
          if (attachment.asset) continue
          dead.push({
            source: f.relativePath,
            target: rawTarget,
            raw: `[[${rawTargetFull}]]`,
          })
          continue
        }
      }
      // 扫描和渲染必须共用同一个 resolver。此前这里维护了一份简化版
      // resolveSimple,遗漏了 folderLinkOrder,导致可正常渲染的 [[folder/]]
      // 被启动预扫误报为死链。
      const resolved = resolveWikilink(
        targetFull,
        index,
        options,
        isEmbed ? 'transclusion' : 'page',
        f.absolutePath,
      )
      if (resolved.isDead) {
        dead.push({
          source: f.relativePath,
          target: rawTarget,
          raw: `${isEmbed ? '!' : ''}[[${rawTargetFull}]]`,
        })
        continue
      }
      // v0.3.9:成功 resolve,继续看锚点歧义
      if (scanAmbig && headingPart && !headingPart.startsWith('^')) {
        const targetEntry = resolved.target
        if (!targetEntry) continue
        const finalHeadingPart = headingPart.split('#').pop()!.trim()
        const matches2 = findAmbiguousLeadingNumberMatches(targetEntry, finalHeadingPart)
        if (matches2.length > 1) {
          // 仅当 exact text/slug 都没命中(意味着真走了 leading-number 兜底)
          const exactHit = targetEntry.headings.some(
            (h) =>
              h.text === finalHeadingPart ||
              h.slug === finalHeadingPart ||
              h.slug === options.slugify(finalHeadingPart),
          )
          if (!exactHit) {
            ambiguous.push({
              source: f.relativePath,
              raw: `${isEmbed ? '!' : ''}[[${rawTargetFull}]]`,
              headingPart: finalHeadingPart,
              chosen: matches2[0]!.text,
              others: matches2.slice(1).map((h) => h.text),
            })
          }
        }
      }
    }
  }
  return { total, dead, ambiguous }
}

/** Mark only assets addressed by vault syntax so Rollup can emit them early. */
export function markReferencedAssets(
  index: VaultIndex,
  options: ResolvedOptions,
): number {
  let count = 0
  for (const file of index.files.values()) {
    const matches = getScannableMarkdown(file).matchAll(new RegExp(WIKILINK_SOURCE))
    for (const match of matches) {
      const isEmbed = match[1] === '!'
      if (isEmbed ? !options.modules.embeds : !options.modules.wikilinks) continue

      const rawTarget = (splitWikilinkInner(match[2]!)[0] ?? '').trim()
      let processedTarget: string
      if (isEmbed) {
        // Match the renderer's dispatch: only image/audio/video/PDF embeds use
        // the asset pipeline. Other `![[...]]` targets are note transclusions.
        const extension = extractExt(rawTarget)
        const isImage = Boolean(
          extension && options.embeds.imageFileExt.includes(extension),
        )
        if (!isImage && !classifyMediaExt(extension)) continue
        processedTarget = options.embeds.postProcessImageTarget(rawTarget)
      } else {
        processedTarget = options.wikilinks.postProcessLinkTarget(rawTarget)
        const plain = resolvePlainAttachment(
          processedTarget,
          index,
          options,
          file.absolutePath,
        )
        if (!plain.isAttachment || !plain.asset) continue
        const before = plain.asset.referencedBy.size
        plain.asset.referencedBy.add(file.absolutePath)
        if (plain.asset.referencedBy.size !== before) count += 1
        continue
      }
      const resolved = resolveAttachment(
        processedTarget,
        index,
        options,
        file.absolutePath,
      )
      if (!resolved.asset) continue
      const before = resolved.asset.referencedBy.size
      resolved.asset.referencedBy.add(file.absolutePath)
      if (resolved.asset.referencedBy.size !== before) count += 1
    }
  }
  return count
}

/** vitepress.ts wrapper 用:扫完打印汇总 */
export function logDeadLinks(report: DeadLinkReport, deadLink: 'silent' | 'warn' | 'error'): void {
  if (deadLink === 'silent') return
  if (report.dead.length > 0) {
    const head = `vitepress-allyouneed: scanned ${report.total} wikilinks, ` +
      `found ${report.dead.length} dead link(s):`
    if (deadLink === 'error') {
      const details = report.dead
        .map((item) => `  ${item.source}: ${item.raw}`)
        .join('\n')
      throw new Error(`${head}\n${details}`)
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
  // v0.3.9:歧义锚点汇总
  if (report.ambiguous.length > 0) {
    console.warn(
      `vitepress-allyouneed: ${report.ambiguous.length} ambiguous anchor(s) ` +
        `(leading-number matched multiple headings; first chosen):`,
    )
    const bySource = new Map<string, DeadLinkReport['ambiguous']>()
    for (const a of report.ambiguous) {
      const arr = bySource.get(a.source) ?? []
      arr.push(a)
      bySource.set(a.source, arr)
    }
    for (const [src, items] of [...bySource.entries()].sort()) {
      console.warn(`  ${src}`)
      for (const it of items) {
        console.warn(
          `    ${it.raw} #${it.headingPart} → "${it.chosen}" ` +
            `(also matches: ${it.others.map((o) => `"${o}"`).join(', ')})`,
        )
      }
    }
  }
}

function extractExt(target: string): string {
  const cleaned = target.split('#')[0]!
  const dot = cleaned.lastIndexOf('.')
  if (dot <= 0) return ''
  return cleaned.slice(dot + 1).toLowerCase()
}
