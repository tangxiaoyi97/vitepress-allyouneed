/**
 * Dev 模式中间件 —— 拦截未知 URL,从 vault asset 索引里找文件流式响应。
 *
 * 查找顺序:
 *   1. **按相对路径**(`/<base>/<relativePath>`)—— resolveId/load 路径下,
 *      Vue 编译后的 `<img src>` 解析出来的 URL 走这条
 *   2. **按 basename** —— 用户直接在 markdown 用绝对 URL `/foo.png` 时兜底
 *   3. 都没命中 → next() 给 Vite 默认 404
 *
 * 零拷贝、零配置。改图片直接刷新就能看到。
 */

import fs from 'node:fs'
import nodePath from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type {
  VaultIndex,
  ResolvedOptions,
  AssetEntry,
} from '../types.js'
import { basename } from '../../utils/path.js'

export type DevMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) => void

export function createDevMiddleware(
  index: VaultIndex,
  options: ResolvedOptions,
): DevMiddleware {
  return (req, res, next) => {
    if (!req.url) return next()

    const cleanPath = req.url.split('?')[0]!.split('#')[0]!

    // 把 base 前缀剥掉,得到站内绝对路径
    let inSiteUrl = cleanPath
    if (options.base !== '/' && cleanPath.startsWith(options.base)) {
      inSiteUrl = '/' + cleanPath.slice(options.base.length)
    }

    let decoded: string
    try {
      decoded = decodeURIComponent(inSiteUrl)
    } catch {
      return next()
    }

    // 必须含扩展名才尝试解析(避免误吞 /about 这种页面路由)
    if (!/\.[a-zA-Z0-9]+$/.test(decoded)) return next()

    // 1) 先按相对路径查
    const relCandidate = decoded.replace(/^\/+/, '')
    let asset: AssetEntry | undefined =
      index.assetsByRelativePath.get(relCandidate)

    // 2) 再按 basename 查
    if (!asset) {
      const bn = basename(decoded)
      const map = options.caseSensitive
        ? index.assetsByBasename
        : index.assetsByBasenameLower
      const key = options.caseSensitive ? bn : bn.toLowerCase()
      const candidates = map.get(key)
      if (candidates && candidates.length > 0) asset = candidates[0]
    }

    if (!asset) return next()

    let stat: fs.Stats
    try {
      stat = fs.statSync(asset.absolutePath)
    } catch {
      return next()
    }

    res.statusCode = 200
    res.setHeader('Content-Type', guessMime(asset.extension))
    res.setHeader('Content-Length', String(stat.size))
    res.setHeader('Cache-Control', 'no-cache')

    fs.createReadStream(asset.absolutePath)
      .on('error', () => next())
      .pipe(res)
  }
}

// 极简 MIME 映射,够 vault 里常见 asset 用。
const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  avif: 'image/avif',
  ico: 'image/x-icon',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  flac: 'audio/flac',
  pdf: 'application/pdf',
  canvas: 'application/json',
  excalidraw: 'application/json',
}

function guessMime(ext: string): string {
  return MIME[ext.toLowerCase()] ?? 'application/octet-stream'
}

// 防 unused
export { nodePath }
