/**
 * Asset 占位符 URL + dev 公开 URL helpers。
 *
 * 工作流(v0.1):
 *   1. markdown-it 渲染 ![[image.png]] 时,image.ts 调 buildPlaceholderUrl 出
 *      `<img src="/__ayn_asset__/<encoded-relPath>">`,并把 AssetEntry 登记。
 *   2. Vite 编译 .md→.vue 时 Vue compiler 把 `<img src>` 转成 import;Vite 的
 *      import-analysis 走 resolveId → 我们插件在 src/vite.ts 拦截这个 URL。
 *   3. dev:resolveId 返回虚拟模块,load 导出 `buildPublicUrl(asset)` —— URL
 *      点回 vault asset(由 dev-middleware 流式响应)。
 *   4. build:load 调 `this.emitFile` 把文件丢给 Rollup,导出
 *      `import.meta.ROLLUP_FILE_URL_<id>` —— 插件按内容算 hash,Rollup 替换 URL。
 *
 * 没有 transformIndexHtml/后期字符串替换的路径 —— 全部走标准 Vite 资源管线。
 */

import type { AssetEntry, ResolvedOptions } from '../types.js'
import { basename } from '../../utils/path.js'

/** 占位符 URL 前缀,不会出现在合法 URL 里 */
export const ASSET_PLACEHOLDER_PREFIX = '/__ayn_asset__/'

/**
 * 给 asset 构造占位符 URL,markdown-it 渲染阶段使用。
 * 形如 `/__ayn_asset__/<encoded relativePath>`(base 前置)。
 *
 * 每个路径段分别用 encodeURIComponent 编码,同时保留 `/` 分隔符。这样既避免
 * `%2F` 在 Vite 内部解码形态不稳定,也不会让文件名里的 `#` / `?` 被误当作
 * fragment / query 而截断。
 */
export function buildPlaceholderUrl(
  asset: AssetEntry,
  options: ResolvedOptions,
): string {
  // Encode every segment independently. encodeURI leaves `?` and `#`
  // untouched, which makes Vite interpret a legitimate filename as a query
  // or fragment and truncates the lookup key.
  const id = encodePathSegments(asset.relativePath)
  return options.base + ASSET_PLACEHOLDER_PREFIX.slice(1) + id
}

/**
 * dev 模式下 asset 的最终公开 URL。
 *
 * - preserveAssetPaths=false(默认):URL = base + basename
 * - preserveAssetPaths=true:URL = base + relativePath
 *
 * 这俩 dev-middleware 都能服务(basename + relativePath 双查找)。
 */
export function buildPublicUrl(
  asset: AssetEntry,
  options: ResolvedOptions,
): string {
  const path = options.assets.preserveAssetPaths
    ? asset.relativePath
    : basename(asset.absolutePath)
  const outputDir = normalizeOutputDir(options.assets.outputDir)
  const outputPath = outputDir ? `${outputDir}/${path}` : path
  return options.base + encodePathSegments(outputPath)
}

/** Build-time Rollup fileName, honouring outputDir and path preservation. */
export function buildAssetOutputPath(
  asset: AssetEntry,
  options: ResolvedOptions,
  contentHash: string,
): string {
  const outputDir = normalizeOutputDir(options.assets.outputDir)
  const safeRelative = asset.relativePath
    .split('/')
    .filter((segment) => segment && segment !== '.' && segment !== '..')
    .map(sanitizeOutputSegment)
    .join('/')
  let outputPath: string
  if (options.assets.preserveAssetPaths) {
    outputPath = safeRelative
  } else {
    const filename = sanitizeOutputSegment(basename(asset.absolutePath))
    const dot = filename.lastIndexOf('.')
    outputPath = dot > 0
      ? `${filename.slice(0, dot)}-${contentHash}${filename.slice(dot)}`
      : `${filename}-${contentHash}`
  }
  return outputDir ? `${outputDir}/${outputPath}` : outputPath
}

export function normalizeOutputDir(outputDir: string): string {
  return outputDir
    .replace(/\\/g, '/')
    .split('/')
    .filter((segment) => segment && segment !== '.' && segment !== '..')
    .map(sanitizeOutputSegment)
    .join('/')
}

export function encodePathSegments(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

/**
 * Keep emitted filenames URL-safe without collisions. `#`, `?` and `%` have
 * structural URL meaning; escape `~` as well so a literal `~23` can never
 * collide with an escaped `#`.
 */
function sanitizeOutputSegment(segment: string): string {
  return segment
    .replace(/~/g, '~7E')
    .replace(/%/g, '~25')
    .replace(/#/g, '~23')
    .replace(/\?/g, '~3F')
}
