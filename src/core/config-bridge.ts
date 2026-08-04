/**
 * VitePress / Vite 配置桥接。
 *
 * 负责把外部配置(VitePress site config、Vite 的 ResolvedConfig)和用户传入
 * 的插件选项合并,产出一份 ResolvedOptions —— 所有字段都填值,后续模块只看这份。
 */

import type {
  AllYouNeedOptions,
  ResolvedOptions,
  PageLinkAttrs,
  ImageEmbedAttrs,
} from './types.js'
import { defaultSlugify } from './slugify.js'
import { DEFAULT_INLINE_TAG_PATTERN } from './tags.js'

const DEFAULT_ASSET_EXTENSIONS = [
  // 位图
  'bmp',
  'gif',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'webp',
  'avif',
  'ico',
  // 视频
  'mp4',
  'webm',
  'mov',
  'm4v',
  // 音频
  'mp3',
  'wav',
  'ogg',
  'm4a',
  'flac',
  // 文档
  'pdf',
  // Obsidian 专属
  'canvas',
  'excalidraw',
]

const DEFAULT_IMAGE_EXTENSIONS = [
  'bmp',
  'gif',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'webp',
  'avif',
  'ico',
]

/**
 * 合并默认值与用户配置,产出 ResolvedOptions。
 *
 * @param user 用户传入(可能为空对象)
 * @param ctx  外部上下文(VitePress / Vite 决议出的值)
 */
export function resolveOptions(
  user: AllYouNeedOptions = {},
  ctx: {
    srcDir?: string
    base?: string
    cleanUrls?: boolean
    /** VitePress markdown.anchor.slugify 若被用户覆写 */
    externalSlugify?: (text: string) => string
  } = {},
): ResolvedOptions {
  const srcDir = user.srcDir ?? ctx.srcDir ?? process.cwd()
  let base = user.base ?? ctx.base ?? '/'
  if (!base.startsWith('/')) base = '/' + base
  if (!base.endsWith('/')) base = base + '/'

  const cleanUrls = user.cleanUrls ?? ctx.cleanUrls ?? false
  const slugify = user.slugify ?? ctx.externalSlugify ?? defaultSlugify
  const rewrite = resolveRewrite(user.rewrites)

  const wikilinksUser = user.wikilinks ?? {}
  const embedsUser = user.embeds ?? {}
  const scanUser = user.scan ?? {}
  const assetsUser = user.assets ?? {}
  const modulesUser = user.modules ?? {}
  const viewsUser = user.views ?? {}

  const wikilinksHtmlAttrs: PageLinkAttrs = wikilinksUser.htmlAttributes ?? {}
  const embedsHtmlAttrs: ImageEmbedAttrs = embedsUser.htmlAttributes ?? {}

  return {
    srcDir,
    base,
    cleanUrls,
    rewrite,
    caseSensitive: user.caseSensitive ?? false,
    deadLink: user.deadLink ?? 'warn',
    onConflict: user.onConflict ?? 'shortest',
    onAliasConflict: user.onAliasConflict ?? 'first',

    scan: {
      // VitePress 1.x only discovers `.md` pages (`**.md`). Keeping the
      // scanner on the same file set prevents links to pages that can never
      // be built.
      include: scanUser.include ?? ['**/*.md'],
      exclude: scanUser.exclude ?? [],
      followSymlinks: scanUser.followSymlinks ?? false,
      respectGitignore: scanUser.respectGitignore ?? true,
      assetExtensions: scanUser.assetExtensions ?? DEFAULT_ASSET_EXTENSIONS,
    },

    assets: {
      mode: assetsUser.mode ?? 'auto',
      preserveAssetPaths: assetsUser.preserveAssetPaths ?? false,
      outputDir: assetsUser.outputDir ?? '_assets',
    },

    wikilinks: {
      postProcessLinkTarget:
        wikilinksUser.postProcessLinkTarget ?? ((t: string) => t.trim()),
      postProcessLinkLabel:
        wikilinksUser.postProcessLinkLabel ?? ((l: string) => l.trim()),
      allowLinkLabelFormatting:
        wikilinksUser.allowLinkLabelFormatting ?? false,
      linkText: wikilinksUser.linkText ?? 'basename',
      htmlAttributes: wikilinksHtmlAttrs,
      // v0.3.9:锚点匹配模式,默认 leading-number(按章节号前缀匹配)
      anchorMatch: wikilinksUser.anchorMatch ?? 'leading-number',
    },

    embeds: {
      imageFileExt: embedsUser.imageFileExt ?? DEFAULT_IMAGE_EXTENSIONS,
      defaultAltText: embedsUser.defaultAltText ?? false,
      postProcessImageTarget:
        embedsUser.postProcessImageTarget ?? ((t: string) => t.trim()),
      postProcessAltText:
        embedsUser.postProcessAltText ?? ((a: string) => a.trim()),
      uriSuffix: embedsUser.uriSuffix ?? '',
      transclusionMaxDepth: embedsUser.transclusionMaxDepth ?? 8,
      htmlAttributes: embedsHtmlAttrs,
    },

    views: {
      enabled: {
        graph: viewsUser.enabled?.graph ?? true,
        stats: viewsUser.enabled?.stats ?? true,
        tags: viewsUser.enabled?.tags ?? true,
      },
      urlPrefix: viewsUser.urlPrefix ?? '_perspectives_',
      names: {
        graph: viewsUser.names?.graph ?? 'graph',
        stats: viewsUser.names?.stats ?? 'stats',
        tags: viewsUser.names?.tags ?? 'tags',
      },
      // 'injectInto' 优先(v0.3+);否则从老的 'sidebar' 字段推断;再否则默认 'nav'
      // v0.4.0:用户仍传老 sidebar 字段时 console.warn 一次(v0.5 将删)
      injectInto:
        viewsUser.injectInto ??
        (() => {
          if (viewsUser.sidebar !== undefined) {
            console.warn(
              "vitepress-allyouneed: views.sidebar ('auto'|false) is deprecated and will be removed in v0.5. " +
                "Use views.injectInto: 'sidebar' | 'nav' | 'both' | 'off' instead.",
            )
          }
          return viewsUser.sidebar === false
            ? 'off'
            : viewsUser.sidebar === 'auto'
              ? 'sidebar'
              : 'nav'
        })(),
      sidebar: viewsUser.sidebar ?? 'auto',
      sidebarText: {
        group: viewsUser.sidebarText?.group ?? 'Perspectives',
        graph: viewsUser.sidebarText?.graph ?? 'Graph',
        stats: viewsUser.sidebarText?.stats ?? 'Stats',
        tags: viewsUser.sidebarText?.tags ?? 'Tags',
      },
      graphMaxNodes: viewsUser.graphMaxNodes ?? 500,
      localGraph: {
        enabled: viewsUser.localGraph?.enabled ?? false,
        depth: boundedDepth(viewsUser.localGraph?.depth, 1),
        maxNodes: positiveInteger(viewsUser.localGraph?.maxNodes, 24),
        modalDepth: boundedDepth(viewsUser.localGraph?.modalDepth, 2),
        modalMaxNodes: positiveInteger(
          viewsUser.localGraph?.modalMaxNodes,
          100,
        ),
        mobile: viewsUser.localGraph?.mobile === 'hidden' ? 'hidden' : 'button',
      },
      dataFileName: viewsUser.dataFileName ?? 'vault-data.json',
      parseInlineTags: viewsUser.parseInlineTags ?? true,
      // v0.3.9:行内 #tag 默认正则。tags/rule.ts + views/generate-data.ts 都读这个
      inlineTagPattern:
        viewsUser.inlineTagPattern ?? DEFAULT_INLINE_TAG_PATTERN,
    },

    modules: {
      wikilinks: modulesUser.wikilinks ?? true,
      embeds: modulesUser.embeds ?? true,
      views: modulesUser.views ?? true,
      callouts: modulesUser.callouts ?? true,
      highlight: modulesUser.highlight ?? true,
      comments: modulesUser.comments ?? true,
      footnotes: modulesUser.footnotes ?? true,
      blockRefs: modulesUser.blockRefs ?? true,
    },

    sidebarAuto: user.sidebarAuto ?? {},

    // v0.3.9:comments 模块的细配置
    comments: {
      preserveAsHtmlComment: user.comments?.preserveAsHtmlComment ?? true,
    },

    slugify,
  }
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1
    ? Math.floor(value)
    : fallback
}

function boundedDepth(value: number | undefined, fallback: 1 | 2): 1 | 2 {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return value >= 2 ? 2 : 1
}

/**
 * VitePress accepts either a rewrite function or an ordered path-to-regexp
 * style rule map. We implement its commonly used named parameters locally so
 * the scanner does not depend on VitePress' private bundled dependencies.
 */
function resolveRewrite(
  rewrites: AllYouNeedOptions['rewrites'],
): (id: string) => string {
  if (typeof rewrites === 'function') {
    return (id) => rewrites(id) || id
  }
  if (rewrites && typeof rewrites === 'object') {
    const rules = Object.entries(rewrites).map(([from, to]) =>
      compileRewriteRule(from, to),
    )
    return (id) => {
      for (const rule of rules) {
        const rewritten = rule(id)
        if (rewritten !== undefined) return rewritten
      }
      return id
    }
  }
  return (id) => id
}

type RewriteRule = (id: string) => string | undefined

function compileRewriteRule(from: string, to: string): RewriteRule {
  if (!from.startsWith('^') && !from.includes(':')) {
    return (id) => (id === from ? to : undefined)
  }

  if (from.startsWith('^')) {
    const regex = new RegExp(from)
    return (id) => {
      regex.lastIndex = 0
      const match = regex.exec(id)
      if (!match) return undefined
      return interpolateRewriteTarget(to, match.groups ?? {}, match)
    }
  }

  const names: string[] = []
  let source = '^'
  for (let i = 0; i < from.length;) {
    if (from[i] !== ':') {
      source += escapeRegexCharacter(from[i]!)
      i += 1
      continue
    }

    i += 1
    const start = i
    while (i < from.length && /[A-Za-z0-9_]/.test(from[i]!)) i += 1
    const name = from.slice(start, i)
    if (!name) {
      source += ':'
      continue
    }
    const modifier = /[*+?]/.test(from[i] ?? '') ? from[i++]! : ''
    names.push(name)
    source += modifier === '*'
      ? '(.*)'
      : modifier === '+'
        ? '(.+)'
        : modifier === '?'
          ? '([^/]*)'
          : '([^/]+)'
  }
  source += '$'
  const regex = new RegExp(source)

  return (id) => {
    const match = regex.exec(id)
    if (!match) return undefined
    const params: Record<string, string> = {}
    names.forEach((name, index) => {
      params[name] = match[index + 1] ?? ''
    })
    return interpolateRewriteTarget(to, params, match)
  }
}

function interpolateRewriteTarget(
  target: string,
  params: Record<string, string>,
  match: RegExpExecArray,
): string {
  return target
    .replace(/:([A-Za-z0-9_]+)[*+?]?/g, (_all, name: string) =>
      params[name] ?? '',
    )
    .replace(/\$(\d+)/g, (_all, index: string) =>
      match[Number(index)] ?? '',
    )
}

function escapeRegexCharacter(character: string): string {
  return /[\\^$.*+?()[\]{}|]/.test(character) ? `\\${character}` : character
}
