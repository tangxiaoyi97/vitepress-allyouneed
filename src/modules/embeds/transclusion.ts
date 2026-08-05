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
import type { AllYouNeedEnv, FileEntry, HeadingEntry } from '../../core/types.js'
import { resolveWikilink } from '../../core/resolver.js'
import { escapeHtml } from '../../utils/escape.js'

interface TransclusionCacheEntry {
  html: string
}

interface TransclusionRenderContext {
  /** 同一外层 render 内按嵌入出现顺序分配唯一实例号。 */
  nextInstance: number
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

  // 第一层嵌入也要把根文档纳入调用栈。否则 A → B → A
  // 会多渲染一整层 A，到下一层才能发现循环。
  const stack =
    env.transclusionStack ?? (env.currentPath ? [env.currentPath] : [])
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

  const rawFragment = extractFragment(rawTarget)
  const fragment = result.fragment?.type === 'block'
    ? result.fragment.block?.content
    : result.fragment?.type === 'heading' && result.fragment.heading
      ? sliceByHeading(target, result.fragment.heading)
      : rawFragment
        ? undefined
        : target.content

  if (fragment == null) {
    return `<div class="transclusion transclusion--unmatched-anchor" data-target="${escapeHtml(
      rawTarget,
    )}">⚠️ Block or heading not found: <code>#${escapeHtml(
      rawFragment,
    )}</code></div>`
  }

  // 循环判定依赖来路，所以缓存键必须包含当前调用栈。
  // 否则同一笔记先从 A 嵌入、再从 C 嵌入时可能复用错误的循环结果。
  const cacheKey = `${stack.join('\u0000')}::${target.absolutePath}::${rawFragment}`
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
    ;(childEnv as unknown as Record<string, unknown>)._transclusionRenderContext =
      getRenderContext(env)

    inner = md.render(fragment, childEnv)
    cache.set(cacheKey, { html: inner })
  }

  // 每个 transclusion 实例都需要自己的 DOM id 命名空间。
  // 同一笔记多次嵌入时，heading / footnote / block-ref 默认
  // 都会产生相同 id；这里同步改写 id 与其页内引用。缓存保留
  // 未针对当前实例命名的 HTML，因此命中缓存也不会重复 id。
  const renderContext = getRenderContext(env)
  const instance = renderContext.nextInstance++
  const instanceKey = [
    stack[0] ?? env.currentPath ?? '<root>',
    stack.join('>'),
    target.relativePath,
    rawFragment,
  ].join('::')
  inner = namespaceEmbeddedIds(
    inner,
    `ayn-tx-${stableHash(instanceKey)}-${instance.toString(36)}`,
  )

  // FileEntry URLs are intentionally site-root relative because VitePress
  // prepends `base` for markdown link tokens. This source link is raw HTML,
  // so VitePress never gets that chance; apply the configured base here.
  const sourceUrl = withBase(result.url, options.base)

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
  // The degraded link is also emitted as raw HTML rather than a markdown-it
  // link token, so it needs the same explicit base handling as source links.
  const url = withBase(result.url, options.base)
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

function extractFragment(raw: string): string {
  const hashIdx = raw.indexOf('#')
  if (hashIdx < 0) return ''
  return raw.slice(hashIdx + 1).trim()
}

/** Apply a normalized VitePress base to a site-root-relative vault URL. */
function withBase(url: string, base: string): string {
  if (/^(?:[a-z][a-z+.-]*:|#)/i.test(url)) return url
  const normalizedBase = `/${base}`.replace(/\/+/g, '/').replace(/\/?$/, '/')
  if (url === '/') return normalizedBase
  return normalizedBase + url.replace(/^\/+/, '')
}

function sliceByHeading(
  target: FileEntry,
  matched: HeadingEntry,
): string {
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

function getRenderContext(env: AllYouNeedEnv): TransclusionRenderContext {
  const e = env as unknown as {
    _transclusionRenderContext?: TransclusionRenderContext
  }
  if (!e._transclusionRenderContext) {
    e._transclusionRenderContext = { nextInstance: 0 }
  }
  return e._transclusionRenderContext
}

/**
 * 为嵌入片段内所有 DOM id 加实例前缀，并同步改写只指向
 * 该片段内 id 的 href / IDREF 属性。普通页面渲染不经过此函数，
 * 所以源笔记自身的锚点保持兼容。
 */
function namespaceEmbeddedIds(html: string, namespace: string): string {
  const ids = new Map<string, string>()
  const idRe = /\bid=(['"])([^'"\s<>]+)\1/g
  let match: RegExpExecArray | null
  while ((match = idRe.exec(html)) !== null) {
    const id = match[2]!
    if (!ids.has(id)) ids.set(id, `${namespace}-${id}`)
  }
  if (ids.size === 0) return html

  let output = html.replace(idRe, (_full, quote: string, id: string) => {
    return `id=${quote}${ids.get(id) ?? id}${quote}`
  })

  // 页内链接只改写 href="#id"；源文档链接 /note#heading 不受影响。
  output = output.replace(
    /\bhref=(['"])#([^'"\s<>]+)\1/g,
    (full, quote: string, id: string) => {
      const mapped = ids.get(id)
      return mapped ? `href=${quote}#${mapped}${quote}` : full
    },
  )

  // 覆盖常见的单值及空格分隔 IDREF 属性。
  output = output.replace(
    /\b(for|aria-labelledby|aria-describedby|aria-controls)=(['"])([^'"]*)\2/g,
    (full, attr: string, quote: string, value: string) => {
      let changed = false
      const mapped = value
        .split(/(\s+)/)
        .map((part) => {
          const replacement = ids.get(part)
          if (replacement) changed = true
          return replacement ?? part
        })
        .join('')
      return changed ? `${attr}=${quote}${mapped}${quote}` : full
    },
  )

  return output
}

/** 小而稳定的 32-bit FNV-1a，仅用于生成 DOM id 前缀。 */
function stableHash(value: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}
