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
import { resolveWikilink } from '../../core/resolver.js'
import {
  renderPageLink,
  renderDeadLink,
} from './render.js'
import { handleImageEmbed } from '../embeds/image.js'
import { handleTransclusion } from '../embeds/transclusion.js'
import { classifyMediaExt, handleMediaEmbed } from '../embeds/media.js'
import { splitWikilinkInner } from '../../utils/wikilink.js'

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

    // 按 markdown-it 约定:silent 模式找到匹配返回 true
    if (silent) return true

    // 提取 env
    const env = state.env as AllYouNeedEnv
    if (!env || !env.index || !env.options) {
      // 没注入索引 → 视为不识别,把控制权交回 markdown-it 默认链
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

    // 普通 [[wikilink]]
    return emitPageLink(state, rawTarget, aliasParts, env)
  }
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
