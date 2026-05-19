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
 *      `import.meta.ROLLUP_FILE_URL_<id>` —— Rollup 自动算 hash 并替换。
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
 * **用 encodeURI 而不是 encodeURIComponent** —— 我们希望保留 `/` 不被编码成 `%2F`。
 * 原因:Vite 在内部把 URL 路径中的 `%2F` 解码回 `/`,导致 resolveId/load 收到的 id
 * 时而带 `%2F` 时而带 `/`,匹配 byRelativePath 不稳定。统一用 encodeURI 让路径段
 * 保留 `/`,resolveId/load 拿到的 id 总是 `/` 形式,行为稳定。
 */
export function buildPlaceholderUrl(
  asset: AssetEntry,
  options: ResolvedOptions,
): string {
  const id = encodeURI(asset.relativePath)
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
  return options.base + encodeURI(path)
}
