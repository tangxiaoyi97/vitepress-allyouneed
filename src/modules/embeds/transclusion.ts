/**
 * 笔记 transclusion:`![[note]]`、`![[note#heading]]`。
 *
 * **transclusion 始终是 block-level**:它内部会含 `<h1>` / `<div>` / `<pre>`
 * 等 block 元素,放进 `<p>` 里会产生不合法 HTML。
 *
 * 两种入口:
 *   - block 入口(从 embed block-rule 调用)→ 推 html_block,无 <p> 包裹。
 *   - inline 入口(从 wikilinks rule 调用)→ 不真做 transclusion,降级为
 *     带告警的 `<a>` 链接 + warn 日志(原因同上)。
 *
 * 内部 helper renderTransclusionHtml 返回完整 `<div class="transclusion">...</div>`
 * 字符串,供 block 入口使用。
 */

import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs'
import type MarkdownIt from 'markdown-it'
import type { AllYouNeedEnv, FileEntry } from '../../core/types.js'
import { resolveWikilink } from '../../core/resolver.js'
import { escapeHtml } from '../../utils/escape.js'

interface TransclusionCacheEntry {
  html: string
}

/**
 * 公共渲染:返回完整 `<div class="transclusion">…</div>` HTML 字符串。
 * 失败/循环/超深时返回带告警 class 的 div。
 */
export function renderTransclusionHtml(
  md: MarkdownIt,
  rawTarget: string,
  aliasParts: string[],
  env: AllYouNeedEnv,
): string {
  const { index, options } = env
  // v0.3.4:传 currentPath,支持 Obsidian "相对当前文件" 路径模式
  const result = resolveWikilink(
    rawTarget,
    index,
    options,
    'transclusion',
    env.currentPath,
  )

  if (result.isDead || !result.target) {
    // v0.3.9:UI 文案统一英文
    return `<div class="transclusion transclusion--dead" data-target="${escapeHtml(
      rawTarget,
    )}">⚠️ Note not found: <code>${escapeHtml(rawTarget)}</code></div>`
  }

  const target = result.target

  // 注册 backlink
  const arr = index.backlinks.get(target.absolutePath) ?? []
  if (env.currentPath) {
    arr.push({
      fromPath: env.currentPath,
      fromUrl: index.files.get(env.currentPath)?.url ?? '',
      context: '',
      isEmbed: true,
      line: -1,
    })
  }
  index.backlinks.set(target.absolutePath, arr)

  const stack = env.transclusionStack ?? []
  if (stack.includes(target.absolutePath)) {
    return `<div class="transclusion transclusion--cycle" data-target="${escapeHtml(
      rawTarget,
    )}">⚠️ Cyclic transclusion: <code>${escapeHtml(
      rawTarget,
    )}</code> is already in the transclusion chain</div>`
  }

  const depth = env.transclusionDepth ?? 0
  if (depth >= options.embeds.transclusionMaxDepth) {
    return `<div class="transclusion transclusion--too-deep" data-target="${escapeHtml(
      rawTarget,
    )}">⚠️ Transclusion nesting too deep (&gt; ${options.embeds.transclusionMaxDepth})</div>`
  }

  const headingPart = extractHeading(rawTarget)
  const fragment = headingPart
    ? sliceByHeading(target, headingPart, options.slugify)
    : target.content

  if (fragment == null) {
    return `<div class="transclusion transclusion--unmatched-anchor" data-target="${escapeHtml(
      rawTarget,
    )}">⚠️ Heading not found: <code>#${escapeHtml(
      headingPart,
    )}</code></div>`
  }

  const cacheKey = `${target.absolutePath}::${headingPart ?? ''}`
  const cache = getCache(env)
  let inner: string
  const cached = cache.get(cacheKey)
  if (cached) {
    inner = cached.html
  } else {
    // ⚠️ 关键:childEnv **只显式继承**我们这个插件需要共享的字段。
    // 不能用 { ...env, ... } 浅拷贝,否则 env.frontmatter / env.__data /
    // env.headers / env.excerpt 等 VitePress per-page 字段会被引用共享。
    // 递归 md.render 时,@mdit-vue/plugin-frontmatter 等插件会就地重置
    // 这些字段(因为内联的 fragment 没有自己的 frontmatter),从而 **覆盖
    // 掉外层页面的 frontmatter** —— VitePress 后续读不到 pageData → 路由
    // 数据缺失 → 首页 404。这是 v0.1 收尾期最坑的一个 bug,见 transclusion 测试。
    const childEnv: AllYouNeedEnv = {
      index: env.index,
      options: env.options,
      currentPath: target.absolutePath,
      transclusionStack: [...stack, target.absolutePath],
      transclusionDepth: depth + 1,
      // 跨递归共享:asset 引用集合(build 时要 emit 所有被引用 asset)
      referencedAssets: env.referencedAssets,
    }
    // 跨递归共享:transclusion 渲染缓存(同一笔记被多处 embed 时复用)
    ;(childEnv as unknown as Record<string, unknown>)._transclusionCache = (
      env as unknown as Record<string, unknown>
    )._transclusionCache

    inner = md.render(fragment, childEnv)
    cache.set(cacheKey, { html: inner })
  }

  const sourceUrl = headingPart
    ? `${target.url}#${options.slugify(headingPart)}`
    : target.url

  const aliasData = aliasParts.length
    ? ` data-caption="${escapeHtml(aliasParts.join('|'))}"`
    : ''

  // v0.2 美化:右上角"前往源文件"按钮 —— 极简箭头图标,不带 basename 文字
  // (basename 已经通过 data-source attr 可以读取;鼠标 hover title 也能看)
  const sourceLink =
    `<a class="transclusion-source-link" ` +
    `href="${escapeHtml(sourceUrl)}" ` +
    `aria-label="Go to source: ${escapeHtml(target.relativePath)}" ` +
    `title="${escapeHtml(target.relativePath)}">↗</a>`

  return (
    `<div class="transclusion" data-source="${escapeHtml(target.relativePath)}"` +
    ` data-source-url="${escapeHtml(sourceUrl)}"${aliasData}>` +
    sourceLink +
    inner +
    `</div>`
  )
}

/**
 * inline 上下文中的 ![[note]] —— 不做真 transclusion,降级为带告警的链接。
 * 原因:transclusion 内含 block 元素(<h1>/<div> 等),嵌进 <p> 会产生不合法 HTML。
 */
export function handleTransclusion(
  state: StateInline,
  rawTarget: string,
  aliasParts: string[],
  env: AllYouNeedEnv,
): boolean {
  if (env.options.deadLink !== 'silent') {
    console.warn(
      `vitepress-allyouneed: ![[${rawTarget}]] cannot be transcluded inline (would produce invalid HTML), degraded to a link. Put it on its own line for full transclusion.`,
    )
  }
  const { index, options } = env
  // v0.3.4:同样传 currentPath
  const result = resolveWikilink(rawTarget, index, options, 'page', env.currentPath)
  const url = result.url
  const label = aliasParts.length
    ? aliasParts.join('|').trim()
    : result.defaultLabel

  const html =
    `<a class="wikilink wikilink--inline-transclusion-degraded" ` +
    `href="${escapeHtml(url)}" ` +
    `data-wikilink-target="${escapeHtml(rawTarget)}" ` +
    `title="Inline transclusion degraded; see console">` +
    `${escapeHtml(label)}</a>`

  const token = state.push('html_inline', '', 0)
  token.content = html
  return true
}

function extractHeading(raw: string): string {
  const hashIdx = raw.indexOf('#')
  if (hashIdx < 0) return ''
  return raw.slice(hashIdx + 1).trim()
}

function sliceByHeading(
  target: FileEntry,
  headingPart: string,
  slugify: (s: string) => string,
): string | undefined {
  const matched = target.headings.find(
    (h) =>
      h.text === headingPart ||
      h.slug === headingPart ||
      h.slug === slugify(headingPart),
  )
  if (!matched) return undefined

  const lines = target.content.split(/\r?\n/)
  const startLine = matched.line + 1
  let endLine = lines.length
  for (let i = startLine; i < lines.length; i++) {
    const l = lines[i]!
    const m = l.match(/^(#{1,6})\s+/)
    if (m && m[1]!.length <= matched.level) {
      endLine = i
      break
    }
  }
  return lines.slice(startLine, endLine).join('\n').trim()
}

function getCache(env: AllYouNeedEnv): Map<string, TransclusionCacheEntry> {
  const e = env as unknown as {
    _transclusionCache?: Map<string, TransclusionCacheEntry>
  }
  if (!e._transclusionCache) e._transclusionCache = new Map()
  return e._transclusionCache
}
