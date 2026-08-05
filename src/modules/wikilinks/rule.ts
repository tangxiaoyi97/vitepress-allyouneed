/**
 * wikilinks inline rule:识别 [[...]] 与 ![[...]]。
 *
 * 这条规则在 wikilinks/embeds 都启用时被共用,内部按 isEmbed 分派。
 * 注册顺序:`md.inline.ruler.before('link', 'allyouneed_wikilinks', rule)`。
 */

import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs'
import type {
  AllYouNeedEnv,
  ResolvedOptions,
  VaultIndex,
} from '../../core/types.js'
import {
  resolvePlainAttachment,
  resolveWikilink,
} from '../../core/resolver.js'
import {
  renderAttachmentLink,
  renderPageLink,
  renderDeadLink,
} from './render.js'
import { handleImageEmbed } from '../embeds/image.js'
import { handleTransclusion } from '../embeds/transclusion.js'
import { classifyMediaExt, handleMediaEmbed } from '../embeds/media.js'
import { splitWikilinkInner } from '../../utils/wikilink.js'
import { buildSiteAssetPath } from '../../core/asset-pipeline/build-emit.js'

/**
 * 构造 inline rule。
 *
 * @param md       markdown-it 实例,仅用于把 env 取出来
 * @param scope    控制此规则处理哪些前缀:'both' / 'wikilinks-only' / 'embeds-only'
 */
export function makeWikilinkRule(
  scope: 'both' | 'wikilinks-only' | 'embeds-only',
): (state: StateInline, silent: boolean) => boolean {
  return function wikilinkRule(state, silent) {
    const src = state.src
    const start = state.pos
    const max = state.posMax

    let isEmbed = false
    let inner: string

    // 探测 ![[ 或 [[
    if (
      src.charCodeAt(start) === 0x21 /* ! */ &&
      src.charCodeAt(start + 1) === 0x5b /* [ */ &&
      src.charCodeAt(start + 2) === 0x5b /* [ */
    ) {
      if (scope === 'wikilinks-only') return false
      isEmbed = true
    } else if (
      src.charCodeAt(start) === 0x5b /* [ */ &&
      src.charCodeAt(start + 1) === 0x5b /* [ */
    ) {
      if (scope === 'embeds-only') return false
    } else {
      return false
    }

    const innerStart = start + (isEmbed ? 3 : 2)
    const closeIdx = src.indexOf(']]', innerStart)
    if (closeIdx < 0 || closeIdx >= max) return false

    inner = src.slice(innerStart, closeIdx)
    if (inner.includes('\n')) return false // 不跨行
    if (!inner.trim()) return false

    // ── HOTFIX(0.5.1):silent 模式必须**推进 state.pos** ───────────────
    // markdown-it 的 link 核心规则在扫描 `[...]` label 时会调 `skipToken`,
    // 后者**以 silent 模式**逐个跑 inline rule(`parser_inline.skipToken`)。
    // 契约是:silent 返回 true 的规则必须把 state.pos 推过自己消费的范围,
    // 否则 markdown-it 抛 `inline rule didn't increment state.pos`
    // (parser_inline.mjs:113)。
    //
    // 此前 silent 直接 `return true` 而不动 state.pos —— 在 GFM 表格单元格里,
    // `[[` 的第一个 `[` 触发 link 规则的 parseLinkLabel → skipToken → 跑到本
    // 规则(silent),pos 没动 → 整个 vitepress build/dev 崩。
    //
    // markdown-it 自带规则(如 backtick)的做法:silent 也设 state.pos,只把
    // **token 产出**门控在 !silent。这里照做。
    if (silent) {
      state.pos = closeIdx + 2
      return true
    }

    // 提取 env
    const env = state.env as AllYouNeedEnv
    if (!env || !env.index || !env.options) {
      // 没注入索引 → 视为不识别,把控制权交回 markdown-it 默认链。
      // 注意:此处尚未改动 state.pos,return false 安全。
      return false
    }

    state.pos = closeIdx + 2 // 推进游标

    // v0.3.4:用 splitWikilinkInner 处理 Obsidian 表格内的 `\|` 转义
    const parts = splitWikilinkInner(inner)
    const rawTarget = parts[0]!
    const aliasParts = parts.slice(1)

    if (isEmbed) {
      // 路由顺序:image → audio/video/pdf → transclusion(.md)
      const ext = extractExt(rawTarget)
      const isImage =
        ext && env.options.embeds.imageFileExt.includes(ext.toLowerCase())
      if (isImage) {
        return handleImageEmbed(state, rawTarget, aliasParts, env)
      }
      const mediaKind = ext ? classifyMediaExt(ext) : null
      if (mediaKind) {
        return handleMediaEmbed(state, mediaKind, rawTarget, aliasParts, env)
      }
      return handleTransclusion(state, rawTarget, aliasParts, env)
    }

    // A non-embedded link with a known asset extension addresses an
    // attachment, not a page. Rollup emission is pre-registered by the vault
    // scan; the render pass also records it for dev/HMR and standalone use.
    const processedTarget = env.options.wikilinks.postProcessLinkTarget(rawTarget)
    const attachment = resolvePlainAttachment(
      processedTarget,
      env.index,
      env.options,
      env.currentPath,
    )
    if (attachment.isAttachment) {
      return emitAttachmentLink(
        state,
        rawTarget,
        aliasParts,
        env,
        attachment,
      )
    }

    // 普通 [[wikilink]]
    return emitPageLink(state, rawTarget, aliasParts, env)
  }
}

function emitAttachmentLink(
  state: StateInline,
  rawTarget: string,
  aliasParts: string[],
  env: AllYouNeedEnv,
  resolved?: ReturnType<typeof resolvePlainAttachment>,
): boolean {
  const result = resolved ?? resolvePlainAttachment(
    env.options.wikilinks.postProcessLinkTarget(rawTarget),
    env.index,
    env.options,
    env.currentPath,
  )
  const userAlias = aliasParts.length > 0 ? aliasParts.join('|').trim() : ''
  const label = userAlias
    ? env.options.wikilinks.postProcessLinkLabel(userAlias)
    : result.rawBasename

  if (!result.asset) {
    handleDeadLink(env, rawTarget)
    return renderDeadLink(
      state,
      env.options.base + encodeURIComponent(result.rawBasename),
      label,
      rawTarget,
      env,
    )
  }

  result.asset.referencedBy.add(env.currentPath ?? '<unknown>')
  env.referencedAssets?.add(result.asset)
  return renderAttachmentLink(
    state,
    buildSiteAssetPath(result.asset, env.options) + result.suffix,
    label,
    result.asset.relativePath,
    env,
  )
}

/**
 * 取一个 path 的扩展名(小写,无点),无扩展名返回 ''。
 */
function extractExt(target: string): string {
  // 拆 #heading 之前先剥
  const cleaned = target.split('#')[0]!
  const dot = cleaned.lastIndexOf('.')
  if (dot <= 0) return ''
  return cleaned.slice(dot + 1).toLowerCase()
}

/**
 * 渲染一个 [[wikilink]]:解析 target → URL → push tokens。
 */
function emitPageLink(
  state: StateInline,
  rawTarget: string,
  aliasParts: string[],
  env: AllYouNeedEnv,
): boolean {
  const { index, options } = env
  const userAlias = aliasParts.length > 0 ? aliasParts.join('|').trim() : ''
  const processed = options.wikilinks.postProcessLinkTarget(rawTarget)
  const result = resolveWikilink(processed, index, options, 'page', env.currentPath)

  const label = userAlias
    ? options.wikilinks.postProcessLinkLabel(userAlias)
    : result.defaultLabel

  // 登记 backlink(用于 graph 模块)
  registerBacklink(env, result.target?.absolutePath, false)

  if (result.isDead) {
    handleDeadLink(env, rawTarget)
    return renderDeadLink(state, result.url, label, rawTarget, env)
  }
  return renderPageLink(state, result, label, env)
}

/** 登记反向链接(target 是被链接的页面)*/
function registerBacklink(
  env: AllYouNeedEnv,
  targetPath: string | undefined,
  isEmbed: boolean,
): void {
  if (!targetPath || !env.currentPath) return
  const arr = env.index.backlinks.get(targetPath) ?? []
  arr.push({
    fromPath: env.currentPath,
    fromUrl: env.index.files.get(env.currentPath)?.url ?? '',
    context: '',
    isEmbed,
    line: -1,
  })
  env.index.backlinks.set(targetPath, arr)
}

/** 死链 → 按 deadLink 策略输出告警 */
function handleDeadLink(env: AllYouNeedEnv, rawTarget: string): void {
  const { options } = env
  const msg = `vitepress-allyouneed: dead link [[${rawTarget}]]${
    env.currentPath ? ` (in ${env.currentPath})` : ''
  }`
  if (options.deadLink === 'silent') return
  if (options.deadLink === 'warn') {
    console.warn(msg)
    return
  }
  // 'error':仍然渲染,但把错误推到 index.warnings 让 build 失败
  env.index.warnings.push({
    kind: 'unknown',
    message: msg,
    affected: env.currentPath ? [env.currentPath] : [],
  })
}

// 抑制 unused 警告
export type { VaultIndex, ResolvedOptions }
