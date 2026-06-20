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

    // 2) basename 兜底 —— **仅**当请求是裸 `/foo.png`(无中间目录)时,
    //    对应"用户在 markdown 里直接写绝对 URL `/foo.png`"的场景。
    //    v0.5:此前对任意多段路径(如 `/wrong/path/logo.png`)都做 basename
    //    兜底并返回第一个同名 asset,会把"不存在的路径"错配成另一目录下的
    //    同名文件,既掩盖 404 又泄露 vault 里是否存在某 basename。现在多段
    //    路径必须精确命中相对路径,杜绝错配。
    if (!asset && !relCandidate.includes('/')) {
      const bn = basename(decoded)
      const map = options.caseSensitive
        ? index.assetsByBasename
        : index.assetsByBasenameLower
      const key = options.caseSensitive ? bn : bn.toLowerCase()
      const candidates = map.get(key)
      if (candidates && candidates.length > 0) {
        // 多个同名时按相对路径最短的选(与 resolveAsset 的 shortest 策略一致),
        // 不再盲取 [0]。
        asset = [...candidates].sort(
          (a, b) => a.relativePath.length - b.relativePath.length,
        )[0]
      }
    }

    if (!asset) return next()

    // v0.5:用索引里已有的 size/mtime 出 Content-Length + ETag/Last-Modified,
    // 省掉每个请求一次同步 statSync(热路径阻塞 event loop),并支持 304 协商缓存
    // (此前 Cache-Control: no-cache 强制每张图每次都重新下载)。
    const etag = `W/"${asset.size.toString(16)}-${Math.floor(asset.mtime).toString(16)}"`
    const lastModified = new Date(asset.mtime).toUTCString()
    const ifNoneMatch = req.headers['if-none-match']
    const ifModifiedSince = req.headers['if-modified-since']
    if (
      ifNoneMatch === etag ||
      (ifModifiedSince && Date.parse(ifModifiedSince) >= Math.floor(asset.mtime))
    ) {
      res.statusCode = 304
      res.setHeader('ETag', etag)
      res.setHeader('Last-Modified', lastModified)
      return res.end()
    }

    res.statusCode = 200
    res.setHeader('Content-Type', guessMime(asset.extension))
    res.setHeader('Content-Length', String(asset.size))
    // dev:允许浏览器缓存但每次回源校验(ETag),改图刷新即时生效
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('ETag', etag)
    res.setHeader('Last-Modified', lastModified)

    fs.createReadStream(asset.absolutePath)
      .on('error', () => {
        // 流式过程中文件被删/读失败:若响应头未发再走 next(),否则只能中断
        if (!res.headersSent) next()
        else res.destroy()
      })
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
