/**
 * Vite 插件入口。
 *
 * 职责:
 *   - configResolved 时扫描 vault 建立 VaultIndex
 *   - configureServer 注册 dev middleware(asset 流式响应,作为兜底)
 *   - **resolveId**:拦截 markdown-it 渲染时产出的 /__ayn_asset__/ 占位 URL,
 *     **直接返回 asset 的绝对文件路径**,后续交给 Vite 自带的资源管线处理:
 *       - dev:Vite 自动按文件路径服务,URL 形如 /<srcDir 相对>/<asset 路径>
 *       - build:Vite 自动 emit + 加 hash,URL 形如 /<assetsDir>/<name>-<hash>.<ext>
 *     这样我们就完全不用维护虚拟模块、不用写 load()、不会再撞 ?import 之类的边界
 *   - handleHotUpdate:dev 增量更新
 *   - config 钩子扩 server.fs.allow:用户的 vault 可能在项目根外,Vite 默认拒绝
 *
 * 设计:**完全不用 `\0` 虚拟模块**。虚拟模块需要 Vite 在 URL 里把 id 编码成
 * `__x00__...`,加上 ?import 之类的 query,加上 URL 里 `/` 的歧义,导致 load()
 * 的 id 形态不稳定,要么找不到 asset 要么返回 HTML 把页面崩了(实测 v0.1
 * 收尾时撞过)。让 Vite 处理真实文件路径就完全没这一摊烦心事。
 */

import fs from 'node:fs'
import nodePath from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'
import type {
  AllYouNeedOptions,
  ResolvedOptions,
  VaultIndex,
} from './core/types.js'
import { resolveOptions } from './core/config-bridge.js'
import { scanVault, updateFile, removeFile } from './core/vault/index.js'
import { createDevMiddleware } from './core/asset-pipeline/dev-middleware.js'
import { ASSET_PLACEHOLDER_PREFIX } from './core/asset-pipeline/build-emit.js'
import { toPosix } from './utils/path.js'
import { generateViewMarkdown } from './core/views/generate-md.js'
import { writeVaultData } from './core/views/generate-data.js'

export interface VitePluginAllYouNeedReturn extends Plugin {
  __getOptions(): ResolvedOptions
  __getIndex(): VaultIndex | undefined
}

/** 剥掉 ?query 和 #hash —— Vite 会带各种后缀来 */
function stripQueryAndHash(id: string): string {
  return id.split('?')[0]!.split('#')[0]!
}

export function viteAllYouNeed(
  userOptions: AllYouNeedOptions = {},
): VitePluginAllYouNeedReturn {
  let resolved: ResolvedOptions
  let index: VaultIndex | undefined
  let viteConfig: ResolvedConfig | undefined

  const plugin: VitePluginAllYouNeedReturn = {
    name: 'vitepress-allyouneed',

    /**
     * 在 Vite 配置定型前扩 server.fs.allow,让我们的 vault srcDir 可被 Vite
     * 服务(即便 srcDir 不在项目根下)。
     */
    config(_userViteConfig, _envCtx) {
      const srcDirOpt = userOptions.srcDir
      if (!srcDirOpt) return undefined
      const abs = toPosix(nodePath.resolve(srcDirOpt))
      return {
        server: {
          fs: {
            allow: [abs],
          },
        },
      }
    },

    configResolved(cfg) {
      viteConfig = cfg
      resolved = resolveOptions(userOptions, {
        srcDir: userOptions.srcDir ?? cfg.root,
        base: userOptions.base ?? cfg.base,
        cleanUrls: userOptions.cleanUrls,
      })
      try {
        index = scanVault(resolved)

        // v0.2:生成虚拟视图 .md(若用户开了 views 模块)
        if (resolved.modules.views) {
          const mdReport = generateViewMarkdown(resolved, index)
          for (const written of mdReport.written) {
            cfg.logger.info(
              `[vitepress-allyouneed] 生成视图 ${written}`,
            )
          }
          for (const skipped of mdReport.skipped) {
            cfg.logger.warn(
              `[vitepress-allyouneed] 跳过 ${skipped.path}: ${skipped.reason}`,
            )
          }
          // 写完 .md 后需要重新 scan,把新生成的视图也收进 index
          if (mdReport.written.length > 0) {
            index = scanVault(resolved)
          }

          // v0.2:写 vault-data.json
          try {
            const dataReport = writeVaultData(index, resolved)
            cfg.logger.info(
              `[vitepress-allyouneed] 写 ${dataReport.path} (${dataReport.bytes}B)`,
            )
          } catch (err) {
            cfg.logger.warn(
              `[vitepress-allyouneed] vault-data.json 写入失败: ${
                err instanceof Error ? err.message : String(err)
              }`,
            )
          }
        }

        if (index.warnings.length > 0) {
          const top = index.warnings.slice(0, 10)
          for (const w of top) {
            cfg.logger.warn(`[vitepress-allyouneed] ${w.message}`)
          }
          if (index.warnings.length > top.length) {
            cfg.logger.warn(
              `[vitepress-allyouneed] (...还有 ${
                index.warnings.length - top.length
              } 条告警)`,
            )
          }
        }
      } catch (err) {
        cfg.logger.error(
          `[vitepress-allyouneed] vault 扫描失败: ${
            err instanceof Error ? err.message : String(err)
          }`,
        )
        index = undefined
      }
    },

    configureServer(server) {
      if (!index) return
      const mw = createDevMiddleware(index, resolved)
      return () => {
        server.middlewares.use(mw)
      }
    },

    handleHotUpdate(ctx) {
      if (!index) return
      try {
        const stat = fs.statSync(ctx.file)
        if (stat.isFile()) {
          updateFile(index, ctx.file, resolved)
        } else if (!fs.existsSync(ctx.file)) {
          removeFile(index, ctx.file, resolved)
        }
      } catch {
        removeFile(index, ctx.file, resolved)
      }
      // v0.2:数据变了 → 重新生成 vault-data.json,触发组件 fetch 新数据
      if (resolved.modules.views) {
        try {
          writeVaultData(index, resolved)
        } catch {
          /* 写不进就算 */
        }
      }
    },

    /**
     * 拦截占位符 URL,**返回真实绝对文件路径**(POSIX 风格)。
     *
     * Vite 拿到文件路径会:
     *   - dev:按文件系统服务,id 经 transform 后变成 `export default '<url>'`
     *   - build:emit asset、Rollup 自动加 hash,导出最终 URL
     */
    resolveId(id) {
      if (!index) return null
      const stripped = stripQueryAndHash(id)
      const ph = ASSET_PLACEHOLDER_PREFIX // '/__ayn_asset__/'
      const phIdx = stripped.indexOf(ph)
      if (phIdx < 0) return null
      const encoded = stripped.slice(phIdx + ph.length)
      let relPath: string
      try {
        relPath = decodeURI(encoded)
      } catch {
        return null
      }
      const asset = index.assetsByRelativePath.get(relPath)
      if (!asset) return null
      // 把原 query(?import / ?inline / ?url 等)透传给下游,否则 Vite 会
      // 用错误的 transform 来处理
      const query = id.slice(stripped.length)
      return asset.absolutePath + query
    },

    /**
     * 给 vitepress.ts wrapper 用。
     */
    __getOptions() {
      return resolved
    },
    __getIndex() {
      return index
    },
  }

  // 防 unused
  void viteConfig

  return plugin
}

export default viteAllYouNeed
