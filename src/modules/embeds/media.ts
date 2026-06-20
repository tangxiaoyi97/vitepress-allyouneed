/**
 * v0.3 — audio / video / pdf embed 渲染。
 *
 * 复用 image.ts 同款 asset 解析路径(走 resolveAsset + buildPlaceholderUrl),
 * 唯一差别是输出 `<audio>` / `<video>` / `<iframe>` 标签。
 *
 * 调用约定:
 *   - block 上下文:返回 HTML 字符串,调用方包成 html_block token
 *   - inline 上下文:由 wikilinks/rule.ts 通过 handleMediaEmbed 推 html_inline
 *
 * 尺寸语法继承 image:
 *   - audio:忽略尺寸(audio 没有视觉尺寸)
 *   - video:支持 width/height
 *   - pdf:支持 width/height(iframe 直接吃)
 */

import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs'
import type { AllYouNeedEnv } from '../../core/types.js'
import { resolveAsset } from '../../core/resolver.js'
import { basename } from '../../utils/path.js'
import { escapeHtml } from '../../utils/escape.js'
import { buildPlaceholderUrl } from '../../core/asset-pipeline/build-emit.js'

// webm 实际多为 video/webm,这里只放 video 列表;classifyMediaExt video-first
const AUDIO_EXTS = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac']
const VIDEO_EXTS = ['mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv']
const PDF_EXTS = ['pdf']

export function isAudioExt(ext: string): boolean {
  return AUDIO_EXTS.includes(ext.toLowerCase())
}
export function isVideoExt(ext: string): boolean {
  return VIDEO_EXTS.includes(ext.toLowerCase())
}
export function isPdfExt(ext: string): boolean {
  return PDF_EXTS.includes(ext.toLowerCase())
}

/** 把 ext 归到 media 类型;不是 media 时返回 null */
export function classifyMediaExt(
  ext: string,
): 'audio' | 'video' | 'pdf' | null {
  if (isVideoExt(ext)) return 'video'
  if (isAudioExt(ext)) return 'audio'
  if (isPdfExt(ext)) return 'pdf'
  return null
}

interface ParsedDim {
  width?: number
  height?: number
}

/** 取最后一段 alias 当尺寸 token(逻辑和 image.ts 一致,但这里精简一份) */
function parseAliasDim(parts: string[]): ParsedDim {
  if (parts.length === 0) return {}
  const last = parts[parts.length - 1]!.trim().toLowerCase()
  if (!last) return {}
  if (last.includes('x')) {
    const [w, h] = last.split('x')
    const wOk = w === '' || /^\d+$/.test(w!)
    const hOk = h === '' || /^\d+$/.test(h!)
    if (!wOk || !hOk) return {}
    return {
      width: w === '' ? undefined : Number(w),
      height: h === '' ? undefined : Number(h),
    }
  }
  if (/^\d+$/.test(last)) return { width: Number(last) }
  return {}
}

/**
 * 解析 asset 路径 → 最终 src URL(沿用 image 同款 placeholder URL)。
 *
 * HOTFIX(0.5.2):asset 缺失时**返回 null**,而不是回退成绝对路径
 * `/<basename>`。那个绝对 URL 会被 VitePress 的 Vite 插件当成模块 import,
 * Rollup 解析不到就**硬中断整个 build**(报告:
 * `Rollup failed to resolve import "/foo.gif"`,同 image.ts 的 bug)。
 * 调用方拿到 null → 走 deadLink 策略告警 + 渲染不触发 Vite 解析的占位标记。
 */
function resolveSrc(rawTarget: string, env: AllYouNeedEnv): string | null {
  const { index, options } = env
  const processedTarget = options.embeds.postProcessImageTarget(rawTarget)
  // v0.3.4:同 image.ts,把 currentPath 传下去支持相对路径
  const { asset } = resolveAsset(processedTarget, index, options, env.currentPath)
  if (asset) {
    asset.referencedBy.add(env.currentPath ?? '<unknown>')
    env.referencedAssets?.add(asset)
    return buildPlaceholderUrl(asset, options) + options.embeds.uriSuffix
  }
  return null
}

/**
 * HOTFIX(0.5.2):缺失 media 资源 → 按 deadLink 策略告警(不 throw)。
 * 与 image.ts 的 handleMissingAsset 对齐。
 */
function handleMissingMedia(
  env: AllYouNeedEnv,
  kind: 'audio' | 'video' | 'pdf',
  rawTarget: string,
): void {
  const { options } = env
  const processedTarget = options.embeds.postProcessImageTarget(rawTarget)
  if (options.deadLink === 'silent') return
  const msg =
    `vitepress-allyouneed: missing ${kind} embed ![[${processedTarget}]]` +
    (env.currentPath ? ` (in ${env.currentPath})` : '')
  if (options.deadLink === 'warn') {
    console.warn(msg)
    return
  }
  // 'error':推到 index.warnings 让 build 以非零退出失败(但不中断渲染)
  env.index.warnings.push({
    kind: 'unknown',
    message: msg,
    affected: env.currentPath ? [env.currentPath] : [],
  })
}

/**
 * HOTFIX(0.5.2):缺失 media 的占位渲染 —— **不产出会被 Vite 解析的 src**。
 * 渲染成一个带提示的 `<span>`(同 image.ts 的 renderMissingImageHtml),
 * 不是 `<audio>`/`<video>`/`<iframe>`,因此 Vite/Rollup 无从 import,build 不会崩。
 */
function renderMissingMediaHtml(rawTarget: string, env: AllYouNeedEnv): string {
  const processedTarget = env.options.embeds.postProcessImageTarget(rawTarget)
  const bn = basename(processedTarget)
  return (
    `<span class="ayn-embed ayn-embed--missing" ` +
    `data-missing-src="${escapeHtml(bn)}" ` +
    `title="Missing media: ${escapeHtml(processedTarget)}">` +
    `⚠ ${escapeHtml(bn)}</span>`
  )
}

// ── 渲染:audio / video / pdf ─────────────────────────────────────

export function renderAudioHtml(
  rawTarget: string,
  _aliasParts: string[],
  env: AllYouNeedEnv,
): string {
  const src = resolveSrc(rawTarget, env)
  // HOTFIX(0.5.2):缺失资源 → 告警 + 占位,绝不产出会崩 build 的绝对 src
  if (src === null) {
    handleMissingMedia(env, 'audio', rawTarget)
    return renderMissingMediaHtml(rawTarget, env)
  }
  return (
    `<audio class="ayn-embed ayn-embed--audio" controls preload="metadata" ` +
    `src="${escapeHtml(src)}">` +
    `Your browser does not support the audio element.` +
    `</audio>`
  )
}

export function renderVideoHtml(
  rawTarget: string,
  aliasParts: string[],
  env: AllYouNeedEnv,
): string {
  const src = resolveSrc(rawTarget, env)
  // HOTFIX(0.5.2):缺失资源 → 告警 + 占位,绝不产出会崩 build 的绝对 src
  if (src === null) {
    handleMissingMedia(env, 'video', rawTarget)
    return renderMissingMediaHtml(rawTarget, env)
  }
  const dim = parseAliasDim(aliasParts)
  const attrs: string[] = [
    `class="ayn-embed ayn-embed--video"`,
    `controls`,
    `preload="metadata"`,
    `src="${escapeHtml(src)}"`,
  ]
  if (dim.width !== undefined) attrs.push(`width="${dim.width}"`)
  if (dim.height !== undefined) attrs.push(`height="${dim.height}"`)
  return (
    `<video ${attrs.join(' ')}>` +
    `Your browser does not support the video element.` +
    `</video>`
  )
}

export function renderPdfHtml(
  rawTarget: string,
  aliasParts: string[],
  env: AllYouNeedEnv,
): string {
  const src = resolveSrc(rawTarget, env)
  // HOTFIX(0.5.2):缺失资源 → 告警 + 占位,绝不产出会崩 build 的绝对 src
  if (src === null) {
    handleMissingMedia(env, 'pdf', rawTarget)
    return renderMissingMediaHtml(rawTarget, env)
  }
  const dim = parseAliasDim(aliasParts)
  // 默认尺寸:全宽 + 600px 高(给 iframe 一个起码可读的视口)
  const width = dim.width !== undefined ? `${dim.width}px` : '100%'
  const height = dim.height !== undefined ? `${dim.height}px` : '600px'
  return (
    `<iframe class="ayn-embed ayn-embed--pdf" ` +
    `src="${escapeHtml(src)}" ` +
    `style="width:${escapeHtml(width)};height:${escapeHtml(height)};border:0" ` +
    `loading="lazy" title="${escapeHtml(basename(rawTarget))}">` +
    `</iframe>`
  )
}

/**
 * inline 上下文入口:由 wikilinks/rule.ts 在判断 isMedia 后调用。
 * 推一个 html_inline token,内含适配的播放器/iframe HTML。
 */
export function handleMediaEmbed(
  state: StateInline,
  kind: 'audio' | 'video' | 'pdf',
  rawTarget: string,
  aliasParts: string[],
  env: AllYouNeedEnv,
): boolean {
  let html: string
  if (kind === 'audio') html = renderAudioHtml(rawTarget, aliasParts, env)
  else if (kind === 'video') html = renderVideoHtml(rawTarget, aliasParts, env)
  else html = renderPdfHtml(rawTarget, aliasParts, env)
  const token = state.push('html_inline', '', 0)
  token.content = html
  return true
}
