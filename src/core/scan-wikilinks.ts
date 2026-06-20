/**
 * v0.3 — 启动时预扫所有 .md,找出死 wikilink,集中 console.warn 一次。
 *
 * 不影响渲染管线(渲染时 wikilink rule 自己也有 dead-link 检测+报警)。
 * 这个函数只是给开发者一个"启动总览",避免要 dev-server 打开每页才看到死链。
 */

import type { ResolvedOptions, VaultIndex } from './types.js'
import { splitWikilinkInner } from '../utils/wikilink.js'
import { findAmbiguousLeadingNumberMatches, resolveWikilink } from './resolver.js'

// v0.3.4:简化为捕获整段 inner,target 拆分交给 splitWikilinkInner(支持 \|)
const WIKILINK_RE = /(!?)\[\[([^\]\n]+)\]\]/g

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
  // 行内 code(支持多个反引号,同数量反引号配对)。
  // v0.5:改用线性扫描替代带反向引用的正则 `/(`+)(?:(?!\1)[\s\S])*?\1/g`,
  // 后者在大量未闭合反引号的输入上会灾难性回溯(ReDoS),而本函数对每个
  // 文件的全文运行,单个恶意/超大笔记即可拖垮 dev/build。
  r = stripInlineCodeLinear(r)
  return r
}

/**
 * 线性(O(n))地把行内 code span 抹成等长空白,保留长度与行号。
 * 规则模仿 CommonMark:开标记是一段 `+`,需要等长的同字符串收尾;
 * 找不到收尾就把开标记本身当普通文本(不抹)。绝不回溯。
 */
function stripInlineCodeLinear(src: string): string {
  const out = src.split('')
  let i = 0
  const n = src.length
  while (i < n) {
    if (src.charCodeAt(i) !== 0x60 /* ` */) {
      i += 1
      continue
    }
    // 数开标记反引号个数
    let openLen = 0
    while (i + openLen < n && src.charCodeAt(i + openLen) === 0x60) openLen += 1
    const contentStart = i + openLen
    // 从内容起点线性找等长收尾
    let j = contentStart
    let closeAt = -1
    while (j < n) {
      if (src.charCodeAt(j) === 0x60) {
        let runLen = 0
        while (j + runLen < n && src.charCodeAt(j + runLen) === 0x60) runLen += 1
        if (runLen === openLen) {
          closeAt = j
          break
        }
        j += runLen // 不等长的反引号 run 整段跳过
      } else {
        j += 1
      }
    }
    if (closeAt === -1) {
      // 没有匹配收尾:开标记当普通文本,跳过这段反引号继续
      i = contentStart
      continue
    }
    // 抹掉 [i, closeAt + openLen) 整段(含两端反引号)为空格,保留换行
    for (let k = i; k < closeAt + openLen; k++) {
      if (out[k] !== '\n') out[k] = ' '
    }
    i = closeAt + openLen
  }
  return out.join('')
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
    const cleaned = stripCodeForScan(f.content)
    const matches = cleaned.matchAll(WIKILINK_RE)
    for (const m of matches) {
      total += 1
      const isEmbed = m[1] === '!'
      // v0.3.4:拆 \| 转义,只看 target 段;再剥 #heading
      const inner = m[2]!
      let rawTargetFull = splitWikilinkInner(inner)[0] ?? ''
      const hashIdx = rawTargetFull.indexOf('#')
      const headingPart = hashIdx >= 0 ? rawTargetFull.slice(hashIdx + 1).trim() : ''
      const rawTarget = (hashIdx >= 0 ? rawTargetFull.slice(0, hashIdx) : rawTargetFull).trim()
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
      // 扫描和渲染必须共用同一个 resolver。此前这里维护了一份简化版
      // resolveSimple,遗漏了 folderLinkOrder,导致可正常渲染的 [[folder/]]
      // 被启动预扫误报为死链。
      const resolved = resolveWikilink(
        rawTargetFull,
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
      if (scanAmbig && headingPart) {
        const targetEntry = resolved.target
        if (!targetEntry) continue
        const matches2 = findAmbiguousLeadingNumberMatches(targetEntry, headingPart)
        if (matches2.length > 1) {
          // 仅当 exact text/slug 都没命中(意味着真走了 leading-number 兜底)
          const exactHit = targetEntry.headings.some(
            (h) =>
              h.text === headingPart ||
              h.slug === headingPart ||
              h.slug === options.slugify(headingPart),
          )
          if (!exactHit) {
            ambiguous.push({
              source: f.relativePath,
              raw: `${isEmbed ? '!' : ''}[[${rawTargetFull}]]`,
              headingPart,
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

/** vitepress.ts wrapper 用:扫完打印汇总 */
export function logDeadLinks(report: DeadLinkReport, deadLink: 'silent' | 'warn' | 'error'): void {
  if (deadLink === 'silent') return
  if (report.dead.length > 0) {
    const head = `vitepress-allyouneed: scanned ${report.total} wikilinks, ` +
      `found ${report.dead.length} dead link(s):`
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
