/**
 * AssetPipeline 模块 —— 统一导出。
 *
 * 真正的"接入 Vite/VitePress"在 src/vite.ts。这里只导出底层工具。
 */

export {
  createDevMiddleware,
  type DevMiddleware,
} from './dev-middleware.js'

export {
  ASSET_PLACEHOLDER_PREFIX,
  buildPlaceholderUrl,
  buildPublicUrl,
} from './build-emit.js'
