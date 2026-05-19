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
    caseSensitive: user.caseSensitive ?? false,
    deadLink: user.deadLink ?? 'warn',
    onConflict: user.onConflict ?? 'shortest',
    onAliasConflict: user.onAliasConflict ?? 'first',

    scan: {
      include: scanUser.include ?? ['**/*.md', '**/*.markdown'],
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
      names: {
        graph: viewsUser.names?.graph ?? 'graph',
        stats: viewsUser.names?.stats ?? 'stats',
        tags: viewsUser.names?.tags ?? 'tags',
      },
      sidebar: viewsUser.sidebar ?? 'auto',
      sidebarText: {
        group: viewsUser.sidebarText?.group ?? 'Vault Views',
        graph: viewsUser.sidebarText?.graph ?? '关系图',
        stats: viewsUser.sidebarText?.stats ?? '统计',
        tags: viewsUser.sidebarText?.tags ?? '标签',
      },
      graphMaxNodes: viewsUser.graphMaxNodes ?? 500,
      dataFileName: viewsUser.dataFileName ?? 'vault-data.json',
      parseInlineTags: viewsUser.parseInlineTags ?? true,
    },

    modules: {
      wikilinks: modulesUser.wikilinks ?? true,
      embeds: modulesUser.embeds ?? true,
      views: modulesUser.views ?? true,
    },

    slugify,
  }
}
