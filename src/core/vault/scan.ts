/**
 * 文件系统遍历。
 *
 * 同步遍历 srcDir,产出绝对路径列表。性能预算:
 * - 10k 文件 / 千级目录,< 1s。
 * - 同步 fs(我们就一份索引,build/dev 启动时一次性建,简单可靠)。
 */

import fs from 'node:fs'
import nodePath from 'node:path'
import { toPosix, extname } from '../../utils/path.js'

export interface WalkEntry {
  absolutePath: string // POSIX 风格
  size: number
  mtime: number
  extension: string
}

/**
 * 递归遍历 srcDir,返回所有非忽略的文件条目。
 *
 * @param srcDir 绝对路径
 * @param isIgnored 判定函数
 * @param followSymlinks 是否跟随符号链接(默认 false)
 */
export function walk(
  srcDir: string,
  isIgnored: (absPath: string) => boolean,
  followSymlinks: boolean,
): WalkEntry[] {
  const out: WalkEntry[] = []
  const seenInodes = new Set<string>() // 防符号链接环

  function visit(dir: string): void {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const ent of entries) {
      const full = nodePath.join(dir, ent.name)
      const posix = toPosix(full)
      if (isIgnored(posix)) continue

      let isDir = ent.isDirectory()
      let isFile = ent.isFile()

      if (ent.isSymbolicLink()) {
        if (!followSymlinks) continue
        try {
          const stat = fs.statSync(full)
          isDir = stat.isDirectory()
          isFile = stat.isFile()
        } catch {
          continue
        }
      }

      if (isDir) {
        if (followSymlinks) {
          try {
            const stat = fs.statSync(full)
            const key = `${stat.dev}:${stat.ino}`
            if (seenInodes.has(key)) continue
            seenInodes.add(key)
          } catch {
            // 取不到 stat 就跳过
            continue
          }
        }
        visit(full)
      } else if (isFile) {
        try {
          const stat = fs.statSync(full)
          out.push({
            absolutePath: posix,
            size: stat.size,
            mtime: stat.mtimeMs,
            extension: extname(posix),
          })
        } catch {
          // 读不到 stat 就跳过
        }
      }
    }
  }

  visit(srcDir)
  return out
}
