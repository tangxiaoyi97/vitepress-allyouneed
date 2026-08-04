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
        patterns.push(trimmed)
      }
    } catch {
      // .gitignore 不存在或不可读 —— 静默跳过
    }
  }

  // Gitignore rules are ordered and `!` negates a previous match. Passing a
  // negated rule directly to picomatch reverses the matcher itself and makes
  // almost every unrelated path look ignored, so retain the rule polarity
  // separately and evaluate in declaration order.
  const rules = patterns
    .map(compileIgnoreRule)
    .filter((rule): rule is IgnoreRule => rule !== undefined)

  return (absPath: string): boolean => {
    const rel = toPosix(relative(srcDir, absPath))
    if (!rel || rel.startsWith('..')) return true

    // 硬忽略:任意路径段命中即忽略
    for (const seg of rel.split('/')) {
      if (HARD_IGNORE_DIRS.has(seg)) return true
    }

    // 用户/gitignore 规则（后规则覆盖前规则）
    let ignored = false
    for (const rule of rules) {
      if (rule.match(rel)) ignored = !rule.negated
    }
    return ignored
  }
}

interface IgnoreRule {
  negated: boolean
  match: (path: string) => boolean
}

function compileIgnoreRule(rawPattern: string): IgnoreRule | undefined {
  let pattern = rawPattern.trim()
  if (!pattern) return undefined

  let negated = false
  if (pattern.startsWith('!')) {
    negated = true
    pattern = pattern.slice(1)
  } else if (pattern.startsWith('\\!')) {
    pattern = pattern.slice(1)
  }
  if (pattern.startsWith('\\#')) pattern = pattern.slice(1)
  if (!pattern) return undefined

  const anchored = pattern.startsWith('/')
  const directoryOnly = pattern.endsWith('/')
  pattern = pattern.replace(/^\/+|\/+$/g, '')
  if (!pattern) return undefined

  const hasSlash = pattern.includes('/')
  const candidates: string[] = []
  if (hasSlash || anchored) {
    candidates.push(pattern)
    // A pattern matching a directory also ignores everything below it.
    if (directoryOnly || !/[*?\[]/.test(pattern)) candidates.push(`${pattern}/**`)
  } else {
    // Slashless gitignore patterns match a basename at any depth.
    candidates.push(`**/${pattern}`)
    if (directoryOnly) candidates.push(`**/${pattern}/**`)
  }

  const matchers = candidates.map((candidate) =>
    picomatch(candidate, { dot: true, nocase: false }),
  )
  return {
    negated,
    match: (path) => matchers.some((matcher) => matcher(path)),
  }
}
