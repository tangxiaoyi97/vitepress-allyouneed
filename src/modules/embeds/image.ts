/**
 * image embed:`![[image.png]]`、`![[image.png|alt]]`、
 * `![[image.png|300]]`、`![[image.png|x200]]`、`![[image.png|300x200]]`、
 * `![[image.png|alt|300x200]]`。
 *
 * 实现说明:
 *   - 渲染为 `<img>` HTML 字符串(`renderImageHtml`)。
 *   - inline 场景:外层用 `html_inline` token 包(图片本身是 inline 元素,
 *     和段落文本混排 OK)。
 *   - block 场景:外层用 `html_block` token 包(整行只有 ![[image]] 时,
 *     避免被多余 `<p>` 包裹)。
 *   - **不用 markdown-it 的 'image' token**:默认渲染器假设 attrs 数组里一定
 *     有 'alt' 项,若没设会 `attrs[-1] = ...` 崩溃。
 */

import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs'
import type {
  AllYouNeedEnv,
  ImageEmbedAttrs,
  ImageEmbedAttrsContext,
} from '../../core/types.js'
import { resolveAsset } from '../../core/resolver.js'
import { basename } from '../../utils/path.js'
import { escapeHtml } from '../../utils/escape.js'
import {
  buildPlaceholderUrl,
  buildPublicUrl,
} from '../../core/asset-pipeline/build-emit.js'

// ── 公共渲染:返回 <img> 标签字符串 ───────────────────────────────

/**
 * 把 ![[image|...]] 渲染为完整的 `<img>` HTML 字符串。
 * 不向 markdown-it state 推 token;调用方决定用 html_inline 还是 html_block。
 */
export function renderImageHtml(
  rawTarget: string,
  aliasParts: string[],
  env: AllYouNeedEnv,
): string {
  const { index, options } = env

  const { altText, dim } = parseAltAndDim(aliasParts)

  const processedTarget = options.embeds.postProcessImageTarget(rawTarget)
  // v0.3.4:传 currentPath,让 resolveAsset 支持 Obsidian 相对当前文件路径
  const { asset } = resolveAsset(processedTarget, index, options, env.currentPath)

  let src: string
  if (asset) {
    asset.referencedBy.add(env.currentPath ?? '<unknown>')
    env.referencedAssets?.add(asset)
    src = buildPlaceholderUrl(asset, options) + options.embeds.uriSuffix
  } else {
    src =
      options.base +
      encodeURIComponent(basename(processedTarget)) +
      options.embeds.uriSuffix
  }

  const finalAlt = determineAlt(altText, processedTarget, options)

  const attrs: Record<string, string> = {
    src,
    alt: finalAlt ?? '',
  }
  if (dim.width !== undefined) attrs.width = String(dim.width)
  if (dim.height !== undefined) attrs.height = String(dim.height)

  const extra = resolveExtra(options.embeds.htmlAttributes, {
    originalHref: src,
    altText: finalAlt,
    dimensions: dim.raw,
    embedType: 'image',
  })
  for (const [k, v] of Object.entries(extra)) {
    if (k === 'class' && attrs.class) {
      attrs.class = attrs.class + ' ' + v
    } else {
      attrs[k] = v
    }
  }

  return (
    '<img ' +
    Object.entries(attrs)
      .map(([k, v]) => `${escapeAttrName(k)}="${escapeHtml(v)}"`)
      .join(' ') +
    ' />'
  )
}

// ── inline 入口(从 wikilinks rule 调用)──────────────────────────

/**
 * 处理 inline 上下文中的 ![[image|...]]:推 html_inline。
 */
export function handleImageEmbed(
  state: StateInline,
  rawTarget: string,
  aliasParts: string[],
  env: AllYouNeedEnv,
): boolean {
  const html = renderImageHtml(rawTarget, aliasParts, env)
  const token = state.push('html_inline', '', 0)
  token.content = html
  return true
}

// ── 解析尺寸 + alt ───────────────────────────────────────────────

interface ParsedDim {
  width?: number
  height?: number
  raw: string
}

function parseAltAndDim(parts: string[]): {
  altText: string
  dim: ParsedDim
} {
  if (parts.length === 0) return { altText: '', dim: { raw: '' } }
  const last = parts[parts.length - 1]!
  const parsedLast = tryParseDimension(last)
  if (parsedLast) {
    const alt = parts.slice(0, -1).join('|').trim()
    return { altText: alt, dim: { ...parsedLast, raw: last } }
  }
  return { altText: parts.join('|').trim(), dim: { raw: '' } }
}

function tryParseDimension(
  s: string,
): { width?: number; height?: number } | undefined {
  const trimmed = s.trim().toLowerCase()
  if (!trimmed) return undefined

  if (trimmed.includes('x')) {
    const [w, h] = trimmed.split('x')
    const wOk = w === '' || /^\d+$/.test(w!)
    const hOk = h === '' || /^\d+$/.test(h!)
    if (!wOk || !hOk) return undefined
    if (w === '' && h === '') return undefined
    return {
      width: w === '' ? undefined : Number(w),
      height: h === '' ? undefined : Number(h),
    }
  }
  if (/^\d+$/.test(trimmed)) {
    return { width: Number(trimmed) }
  }
  return undefined
}

function determineAlt(
  rawAlt: string,
  target: string,
  options: AllYouNeedEnv['options'],
): string | undefined {
  if (rawAlt && rawAlt !== '') {
    return options.embeds.postProcessAltText(rawAlt)
  }
  const def = options.embeds.defaultAltText
  if (def === false) return undefined
  if (def === true) {
    const bn = basename(target)
    const dot = bn.lastIndexOf('.')
    const noExt = dot > 0 ? bn.slice(0, dot) : bn
    return options.embeds.postProcessAltText(noExt)
  }
  if (typeof def === 'string') {
    return def === '' ? '' : options.embeds.postProcessAltText(def)
  }
  return options.embeds.postProcessAltText(basename(target))
}

function resolveExtra(
  attrs: ImageEmbedAttrs,
  ctx: ImageEmbedAttrsContext,
): Record<string, string> {
  if (typeof attrs === 'function') return attrs(ctx)
  return attrs ?? {}
}

function escapeAttrName(k: string): string {
  return k.replace(/[^a-zA-Z0-9_-]/g, '_')
}

// 防 unused
export { buildPublicUrl }
