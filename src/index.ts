/**
 * 默认入口 —— 主要导出 markdown-it 插件函数,并把其它常用 API re-export
 * 出来,方便高级用户从同一个包名取所有东西。
 */

export { default } from './markdown-it.js'
export { allYouNeedMarkdownIt } from './markdown-it.js'

export { viteAllYouNeed } from './vite.js'
export { defineConfigWithAllYouNeed } from './vitepress.js'

export { resolveOptions } from './core/config-bridge.js'
export {
  scanVault,
  createEmptyIndex,
  updateFile,
  removeFile,
} from './core/vault/index.js'
export { resolveWikilink, resolveAsset } from './core/resolver.js'
export { defaultSlugify, extractCustomId } from './core/slugify.js'

export type {
  AllYouNeedOptions,
  ResolvedOptions,
  VaultIndex,
  FileEntry,
  AssetEntry,
  HeadingEntry,
  BlockEntry,
  BacklinkEntry,
  ScanWarning,
  AllYouNeedEnv,
  ResolveResult,
  WikilinksModuleOptions,
  EmbedsModuleOptions,
  ScanOptions,
  AssetsOptions,
  ViewsOptions,
  LocalGraphOptions,
  SidebarAutoUserOptions,
  CommentsOptions,
  PageLinkAttrs,
  PageLinkAttrsContext,
  ImageEmbedAttrs,
  ImageEmbedAttrsContext,
} from './core/types.js'
