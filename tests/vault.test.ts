/**
 * VaultScanner 端到端测试。
 */

import { describe, expect, it, beforeAll } from 'vitest'
import nodePath from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveOptions } from '../src/core/config-bridge.js'
import { scanVault } from '../src/core/vault/index.js'
import type { VaultIndex } from '../src/core/types.js'

const here = nodePath.dirname(fileURLToPath(import.meta.url))
const VAULT = nodePath.join(here, 'fixtures', 'vault')

describe('VaultScanner', () => {
  let index: VaultIndex

  beforeAll(() => {
    const options = resolveOptions({
      srcDir: VAULT,
      cleanUrls: true,
    })
    index = scanVault(options)
  })

  it('扫到所有 md 文件', () => {
    // index, Note A, Note B, notes/projects/c, notes/duplicate/Note A,
    // 中文笔记, note-with-emoji, cycle-a, cycle-b = 9 个
    expect(index.files.size).toBeGreaterThanOrEqual(9)
  })

  it('扫到 asset', () => {
    expect(index.assets.size).toBeGreaterThanOrEqual(1)
    const imgs = index.assetsByBasename.get('image.png')
    expect(imgs).toBeDefined()
    expect(imgs!.length).toBe(1)
  })

  it('byBasename 收集同名文件', () => {
    const noteAs = index.byBasename.get('Note A')
    expect(noteAs?.length).toBe(2) // 顶层 + duplicate/
  })

  it('byAlias 收集 frontmatter 别名(小写)', () => {
    expect(index.byAlias.has('na')).toBe(true)
    expect(index.byAlias.has('note alpha')).toBe(true)
    expect(index.byAlias.has('nb')).toBe(true)
  })

  it('收集 frontmatter tags', () => {
    expect(index.tags.has('test')).toBe(true)
    expect(index.tags.get('test')?.length).toBeGreaterThan(0)
  })

  it('收集 heading + slug', () => {
    const noteA = [...index.files.values()].find(
      (f) => f.basename === 'Note A' && !f.relativePath.includes('duplicate'),
    )
    expect(noteA).toBeDefined()
    const slugs = noteA!.headings.map((h) => h.slug)
    expect(slugs).toContain('note-a')
    expect(slugs).toContain('一级标题')
  })

  it('URL 应用 cleanUrls + base', () => {
    const noteA = [...index.files.values()].find(
      (f) => f.basename === 'Note A' && !f.relativePath.includes('duplicate'),
    )
    expect(noteA!.url).toBe('/Note%20A')
  })

  it('index.md 解析为目录根 URL', () => {
    const idx = index.byRelativePath.get('index.md')
    expect(idx).toBeDefined()
    expect(idx!.url).toBe('/')
  })

  it('嵌套 index.md 保留目录路由的尾斜杠', () => {
    const nested = index.byRelativePath.get('nested/index.md')
    expect(nested).toBeDefined()
    expect(nested!.url).toBe('/nested/')
  })
})
