/**
 * 文件忽略规则。
 *
 * 默认忽略列表针对"VitePress 文档站 + Obsidian vault"的典型布局,
 * 用户可通过 ResolvedOptions.scan.exclude 追加。
 */

import fs from 'node:fs'
import nodePath from 'node:path'
import picomatch from 'picomatch'
import { relative, toPosix } from '../../utils/path.js'

/** 始终忽略,不可关闭 */
export const HARD_IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  '.obsidian',
  '.trash',
  '.vitepress',
  '.next',
  '.nuxt',
  '.cache',
  '.idea',
  '.vscode',
  'dist',
  'build',
])

/**
 * 构造一个 (absolutePath) => boolean 的"是否忽略"判定函数。
 *
 * @param srcDir 扫描根目录(绝对路径)
 * @param userExclude 用户额外的 glob 列表
 * @param respectGitignore 是否读 srcDir/.gitignore
 */
export function buildIgnorer(
  srcDir: string,
  userExclude: string[],
  respectGitignore: boolean,
): (absPath: string) => boolean {
  const patterns: string[] = [...userExclude]
  if (respectGitignore) {
    const gitignore = nodePath.join(srcDir, '.gitignore')
    try {
      const content = fs.readFileSync(gitignore, 'utf8')
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        // .gitignore 规则不完全等价于 picomatch 的 glob,
        // 但对常见 'dist/'、'*.log' 这类够用了。
        patterns.push(trimmed.endsWith('/') ? trimmed + '**' : trimmed)
      }
    } catch {
      // .gitignore 不存在或不可读 —— 静默跳过
    }
  }

  const matchers = patterns.map((p) =>
    picomatch(p, { dot: true, nocase: false }),
  )

  return (absPath: string): boolean => {
    const rel = toPosix(relative(srcDir, absPath))
    if (!rel || rel.startsWith('..')) return true

    // 硬忽略:任意路径段命中即忽略
    for (const seg of rel.split('/')) {
      if (HARD_IGNORE_DIRS.has(seg)) return true
    }

    // 用户/gitignore 规则
    for (const m of matchers) {
      if (m(rel)) return true
    }
    return false
  }
}
