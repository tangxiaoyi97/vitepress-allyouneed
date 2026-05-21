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

        // v0.2:生成虚拟视图 .md(若 views 模块开)
        if (resolved.modules.views) {
          const mdReport = generateViewMarkdown(resolved, index)
          for (const written of mdReport.written) {
            cfg.logger.info(`[vitepress-allyouneed] generated view ${written}`)
          }
          for (const skipped of mdReport.skipped) {
            cfg.logger.warn(
              `[vitepress-allyouneed] skipped ${skipped.path}: ${skipped.reason}`,
            )
          }
          if (mdReport.written.length > 0) {
            index = scanVault(resolved)
          }
          try {
            const dataReport = writeVaultData(index, resolved)
            cfg.logger.info(
              `[vitepress-allyouneed] wrote ${dataReport.path} (${dataReport.bytes}B)`,
            )
          } catch (err) {
            cfg.logger.warn(
              `[vitepress-allyouneed] failed to write vault-data.json: ${
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
              `[vitepress-allyouneed] (...and ${
                index.warnings.length - top.length
              } more warnings)`,
            )
          }
        }
      } catch (err) {
        cfg.logger.error(
          `[vitepress-allyouneed] vault scan failed: ${
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
      // v0.3.6 修(Bug B):区分 add / remove / change。sidebar / nav 是
      // wrapper 在 config time 一次性烘焙到 VitePress site 配置里的,hot-update
      // 只能刷新 Vite 插件的 index(用于 wikilink / asset / vault-data.json),
      // **不能**让 sidebar 跟着变。所以 add / remove 时必须 warn,告诉用户结
      // 构变了要重启 dev。
      // 只关心 .md / .markdown(其它文件变化跟 sidebar/nav 结构无关)
      const isMd = /\.(md|markdown)$/i.test(ctx.file)
      const wasIndexed = isMd && index.files.has(ctx.file)
      let structuralChange: 'add' | 'remove' | null = null
      try {
        const stat = fs.statSync(ctx.file)
        if (stat.isFile()) {
          updateFile(index, ctx.file, resolved)
          const isNowIndexed = index.files.has(ctx.file)
          if (!wasIndexed && isNowIndexed) structuralChange = 'add'
        } else if (!fs.existsSync(ctx.file)) {
          removeFile(index, ctx.file, resolved)
          if (wasIndexed) structuralChange = 'remove'
        }
      } catch {
        removeFile(index, ctx.file, resolved)
        if (wasIndexed) structuralChange = 'remove'
      }
      // v0.3.10:`_sidebar.md` 修改也视作结构变化(其内容直接决定该文件夹的 sidebar)
      const baseName = ctx.file.split(/[\\/]/).pop() ?? ''
      const isSidebarFile = /^_sidebar\.(md|markdown)$/i.test(baseName)
      const needRestart = structuralChange !== null || isSidebarFile
      if (needRestart) {
        const rel = toPosix(ctx.file).replace(toPosix(resolved.srcDir) + '/', '')
        const reason = isSidebarFile
          ? `_sidebar.md changed (${rel})`
          : `${structuralChange === 'add' ? 'added' : 'removed'} ${rel}`
        console.warn(
          `vitepress-allyouneed: structural change detected (${reason}). ` +
            'sidebar/nav are baked into VitePress config at startup. ' +
            'Auto-restarting dev server...',
        )
        // v0.3.10:**自动重启** dev server。比 user 手动 Ctrl+C 友好得多。
        // ctx.server 是 ViteDevServer,有 restart() 方法。
        try {
          // 异步触发(不要 await,handleHotUpdate 应快速返回)
          void ctx.server.restart()
        } catch (e) {
          console.warn(
            'vitepress-allyouneed: auto-restart failed; please restart manually.',
            e instanceof Error ? e.message : String(e),
          )
        }
      }
      // v0.2:数据变了 → 重新生成 vault-data.json
      if (resolved.modules.views) {
        try {
          writeVaultData(index, resolved)
        } catch (e) {
          // v0.3.4:加 warn — Graph/Stats/Tags 不更新通常就是这里失败了
          console.warn(
            'vitepress-allyouneed: failed to rewrite vault-data.json; Graph/Stats/Tags may be stale.',
            e instanceof Error ? e.message : String(e),
          )
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
