/**
 * Vite 插件入口。
 *
 * 职责:
 *   - configResolved 时扫描 vault 建立 VaultIndex
 *   - configureServer 注册 dev middleware(asset 流式响应,作为兜底)
 *   - **resolveId/load**:把 /__ayn_asset__/ 占位 URL 映射到稳定的虚拟模块:
 *       - dev:导出由 dev middleware 提供的公开 URL
 *       - build:用 this.emitFile 输出到 assets.outputDir,并按配置保留路径
 *   - handleHotUpdate:dev 增量更新
 *   - config 钩子扩 server.fs.allow:用户的 vault 可能在项目根外,Vite 默认拒绝
 *
 * 虚拟 id 仅携带 Base64URL 编码后的 vault 相对路径,query/hash 在占位 URL
 * 解析时已分离。标识中没有 `/`、`%2F` 或 URL 结构字符,加载时再无损解码。
 */

import fs from 'node:fs'
import nodePath from 'node:path'
import { createHash } from 'node:crypto'
import type { Plugin, ResolvedConfig } from 'vite'
import type {
  AllYouNeedOptions,
  AssetEntry,
  ResolvedOptions,
  VaultIndex,
} from './core/types.js'
import { resolveOptions } from './core/config-bridge.js'
import { scanVault, updateFile, removeFile } from './core/vault/index.js'
import { createDevMiddleware } from './core/asset-pipeline/dev-middleware.js'
import {
  ASSET_PLACEHOLDER_PREFIX,
  buildAssetOutputPath,
  buildPublicUrl,
  encodePathSegments,
} from './core/asset-pipeline/build-emit.js'
import { toPosix } from './utils/path.js'
import { generateViewMarkdown } from './core/views/generate-md.js'
import { writeVaultData } from './core/views/generate-data.js'
import { markReferencedAssets } from './core/scan-wikilinks.js'

export interface VitePluginAllYouNeedReturn extends Plugin {
  __getOptions(): ResolvedOptions
  __getIndex(): VaultIndex | undefined
}

/** 剥掉 ?query 和 #hash —— Vite 会带各种后缀来 */
function stripQueryAndHash(id: string): string {
  return id.split('?')[0]!.split('#')[0]!
}

const VIRTUAL_ASSET_PREFIX = '\0vitepress-allyouneed:asset:'

/**
 * Rollup may derive a generated chunk name from a virtual module id. Encoding
 * a vault path with encodeURIComponent leaves `%2F` sequences in that name;
 * Node rejects such specifiers during VitePress SSR. Base64URL is reversible,
 * collision-free and contains neither path separators nor percent escapes.
 */
function encodeVirtualAssetPath(relativePath: string): string {
  return Buffer.from(relativePath, 'utf8').toString('base64url')
}

function decodeVirtualAssetPath(encoded: string): string | undefined {
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) return undefined
  try {
    const decoded = Buffer.from(encoded, 'base64url').toString('utf8')
    return encodeVirtualAssetPath(decoded) === encoded ? decoded : undefined
  } catch {
    return undefined
  }
}

export function viteAllYouNeed(
  userOptions: AllYouNeedOptions = {},
): VitePluginAllYouNeedReturn {
  let resolved: ResolvedOptions
  let index: VaultIndex | undefined
  let viteConfig: ResolvedConfig | undefined
  const emittedAssets = new Map<string, string>()
  const emittedOutputAssets = new Map<
    string,
    { referenceId: string; digest: string }
  >()
  const emitReferencedAsset = (
    asset: AssetEntry,
    emitFile: (file: { type: 'asset'; fileName: string; source: Buffer }) => string,
  ): string => {
    const source = fs.readFileSync(asset.absolutePath)
    const digest = createHash('sha256').update(source).digest('hex')
    let fileName = buildAssetOutputPath(asset, resolved, digest.slice(0, 8))
    let existing = emittedOutputAssets.get(fileName)

    // Same basename + same content intentionally shares one emitted asset.
    // If the short hash ever collides, extend only that filename instead of
    // overwriting a different file or changing normal URLs.
    if (existing && existing.digest !== digest) {
      fileName = buildAssetOutputPath(asset, resolved, digest.slice(0, 16))
      existing = emittedOutputAssets.get(fileName)
    }
    if (existing && existing.digest !== digest) {
      fileName = buildAssetOutputPath(asset, resolved, digest)
      existing = emittedOutputAssets.get(fileName)
    }

    const referenceId = existing?.referenceId ?? emitFile({
      type: 'asset',
      fileName,
      source,
    })
    if (!existing) emittedOutputAssets.set(fileName, { referenceId, digest })
    emittedAssets.set(asset.absolutePath, referenceId)
    asset.outputPath = fileName
    return referenceId
  }

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
            const dataReport = writeVaultData(index, resolved, cfg.publicDir)
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

        // Plain `<a href>` assets are not transformed into Vite imports. Mark
        // vault references before buildStart so only genuinely linked assets
        // can be emitted with a deterministic deployment URL.
        markReferencedAssets(index, resolved)

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
        // Configured strict policies (and genuine scanner failures) must stop
        // the build instead of silently disabling the plugin.
        throw err
      }
    },

    buildStart() {
      emittedAssets.clear()
      emittedOutputAssets.clear()
      if (viteConfig?.command !== 'build' || !index) return
      for (const asset of index.assets.values()) {
        if (asset.referencedBy.size === 0) continue
        emitReferencedAsset(asset, (file) => this.emitFile(file))
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
      // VitePress 1.x only builds .md pages.
      const posixFile = toPosix(ctx.file)
      const isMd = /\.md$/i.test(posixFile)
      const wasIndexed = isMd && index.files.has(posixFile)
      let structuralChange: 'add' | 'remove' | null = null
      try {
        const stat = fs.statSync(ctx.file)
        if (stat.isFile()) {
          updateFile(index, posixFile, resolved)
          const isNowIndexed = index.files.has(posixFile)
          if (!wasIndexed && isNowIndexed) structuralChange = 'add'
        } else if (!fs.existsSync(ctx.file)) {
          removeFile(index, posixFile, resolved)
          if (wasIndexed) structuralChange = 'remove'
        }
      } catch (err) {
        // v0.5:只有真正"文件不存在"(ENOENT)才把它从 index 摘掉。
        // statSync 还可能抛 EACCES / EBUSY / EPERM(编辑器原子保存时的临时
        // 重命名、Windows 上占用锁),此前 bare catch 一律当删除处理,会误删
        // 仍存在的文件并触发一次多余的 dev-server 重启。
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          removeFile(index, posixFile, resolved)
          if (wasIndexed) structuralChange = 'remove'
        } else {
          console.warn(
            `vitepress-allyouneed: stat failed for ${ctx.file} ` +
              `(${(err as NodeJS.ErrnoException).code ?? 'unknown'}); ` +
              'keeping existing index entry.',
          )
        }
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
          writeVaultData(index, resolved, viteConfig?.publicDir)
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
     * 拦截占位符 URL,返回携带相对路径的稳定虚拟模块 id。
     */
    resolveId(id) {
      if (!index) return null
      if (id.startsWith(VIRTUAL_ASSET_PREFIX)) return id
      const stripped = stripQueryAndHash(id)
      const ph = ASSET_PLACEHOLDER_PREFIX // '/__ayn_asset__/'
      const phIdx = stripped.indexOf(ph)
      if (phIdx < 0) return null
      const encoded = stripped.slice(phIdx + ph.length)
      let relPath: string
      try {
        relPath = decodeURIComponent(encoded)
      } catch {
        return null
      }
      const asset = index.assetsByRelativePath.get(relPath)
      if (!asset) return null
      return VIRTUAL_ASSET_PREFIX + encodeVirtualAssetPath(asset.relativePath)
    },

    load(id) {
      if (!index || !id.startsWith(VIRTUAL_ASSET_PREFIX)) return null
      const relPath = decodeVirtualAssetPath(
        id.slice(VIRTUAL_ASSET_PREFIX.length),
      )
      if (!relPath) return null
      const asset = index.assetsByRelativePath.get(relPath)
      if (!asset) return null

      if (viteConfig?.command === 'serve') {
        return `export default ${JSON.stringify(buildPublicUrl(asset, resolved))}`
      }

      let referenceId = emittedAssets.get(asset.absolutePath)
      if (!referenceId) {
        referenceId = emitReferencedAsset(asset, (file) => this.emitFile(file))
      }
      // VitePress executes the same asset module in its SSR build. Rollup's
      // `import.meta.ROLLUP_FILE_URL_*` expands to a local `file://` URL there,
      // which then leaks into the prerendered HTML even though the asset is
      // correctly emitted. The output name is already deterministic, so
      // export its deploy URL directly for both client and SSR bundles.
      const publicUrl = resolved.base + encodePathSegments(asset.outputPath!)
      return {
        code: `export default ${JSON.stringify(publicUrl)}`,
        moduleSideEffects: false,
      }
    },

    buildEnd(buildError) {
      if (buildError || viteConfig?.command !== 'build' || !index) return
      const failures = collectPolicyFailures(index, resolved)
      if (failures.length > 0) {
        this.error(
          `vitepress-allyouneed: build failed due to configured error policy:\n` +
            failures.map((message) => `  - ${message}`).join('\n'),
        )
      }
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

  return plugin
}

function collectPolicyFailures(
  index: VaultIndex,
  options: ResolvedOptions,
): string[] {
  const failures: string[] = []
  if (options.onAliasConflict === 'error') {
    failures.push(
      ...index.warnings
        .filter((warning) => warning.kind === 'duplicate-alias')
        .map((warning) => warning.message),
    )
  }
  if (options.deadLink === 'error') {
    failures.push(
      ...index.warnings
        .filter((warning) =>
          /vitepress-allyouneed: (?:dead link|missing .* embed)/.test(
            warning.message,
          ),
        )
        .map((warning) => warning.message),
    )
  }
  return [...new Set(failures)]
}

export default viteAllYouNeed
