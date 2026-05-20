/**
 * v0.3 — sidebar 自动生成测试。
 *
 * 用一个临时 vault(在 mkdtemp 里建)验证:
 *   - 目录变 group
 *   - 根目录文件不在 group
 *   - frontmatter.sidebarTitle / .order / .sidebarHidden 生效
 *   - _ 前缀目录被自动隐藏
 *   - mode='fill-if-empty' / 'force' / 'off' 行为
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import nodePath from 'node:path'
import os from 'node:os'

import { resolveOptions } from '../src/core/config-bridge.js'
import { scanVault } from '../src/core/vault/index.js'
import { generateSidebar } from '../src/core/sidebar-auto/index.js'
import type { SidebarItem } from '../src/core/sidebar-auto/index.js'

function makeVault(dir: string): void {
  // 根
  fs.writeFileSync(nodePath.join(dir, 'home.md'), '# Home\n', 'utf8')
  fs.writeFileSync(
    nodePath.join(dir, 'about.md'),
    '---\nsidebarTitle: About Us\norder: 1\n---\n# About\n',
    'utf8',
  )
  // 一个有 order 的、一个被隐藏的、一个普通
  fs.writeFileSync(
    nodePath.join(dir, 'hidden.md'),
    '---\nsidebarHidden: true\n---\n# Hidden\n',
    'utf8',
  )
  // 目录 guide
  fs.mkdirSync(nodePath.join(dir, 'guide'), { recursive: true })
  fs.writeFileSync(
    nodePath.join(dir, 'guide', 'index.md'),
    '---\nsidebarTitle: Quick Guide\n---\n# Guide\n',
    'utf8',
  )
  fs.writeFileSync(
    nodePath.join(dir, 'guide', 'getting-started.md'),
    '---\norder: 1\n---\n# Getting Started\n',
    'utf8',
  )
  fs.writeFileSync(
    nodePath.join(dir, 'guide', 'advanced.md'),
    '---\norder: 2\n---\n# Advanced\n',
    'utf8',
  )
  // 目录 api(无 index)
  fs.mkdirSync(nodePath.join(dir, 'api'), { recursive: true })
  fs.writeFileSync(
    nodePath.join(dir, 'api', 'users.md'),
    '# Users API\n',
    'utf8',
  )
  // _drafts(下划线前缀,自动忽略)
  fs.mkdirSync(nodePath.join(dir, '_drafts'), { recursive: true })
  fs.writeFileSync(
    nodePath.join(dir, '_drafts', 'wip.md'),
    '# WIP\n',
    'utf8',
  )
}

describe('sidebar-auto — generateSidebar', () => {
  let tmpDir: string

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-sb-'))
    makeVault(tmpDir)
  })

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('根目录文件挂在顶层(不进 group),隐藏 sidebarHidden', () => {
    const opts = resolveOptions({ srcDir: tmpDir, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts)
    const topTexts = sb.map((s) => s.text)
    expect(topTexts).toContain('About Us') // sidebarTitle 生效
    expect(topTexts).toContain('Home') // 默认从 H1
    expect(topTexts).not.toContain('Hidden') // sidebarHidden 隐藏
  })

  it('目录变 group;group.text 来自 index 的 sidebarTitle', () => {
    const opts = resolveOptions({ srcDir: tmpDir, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts)
    const guide = sb.find((s) => s.text === 'Quick Guide')
    expect(guide).toBeDefined()
    expect(guide?.items?.length).toBe(2)
    // order=1 在前
    expect(guide?.items?.[0]?.text).toBe('Getting Started')
    expect(guide?.items?.[1]?.text).toBe('Advanced')
  })

  it('无 index 的目录,group.text 来自 dirname 的 humanize', () => {
    const opts = resolveOptions({ srcDir: tmpDir, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts)
    const api = sb.find((s) => s.text === 'Api')
    expect(api).toBeDefined()
    expect(api?.items?.length).toBe(1)
  })

  it('_ 前缀目录被隐藏', () => {
    const opts = resolveOptions({ srcDir: tmpDir, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts)
    const draft = findRec(sb, '_Drafts')
    expect(draft).toBeNull()
    const drafts = findRec(sb, 'Drafts')
    expect(drafts).toBeNull()
  })

  it('exclude glob 排除指定路径', () => {
    const opts = resolveOptions({ srcDir: tmpDir, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts, { exclude: ['api/**'] })
    const api = sb.find((s) => s.text === 'Api')
    expect(api).toBeUndefined()
  })

  it('sortBy=title 强制按字母', () => {
    const opts = resolveOptions({ srcDir: tmpDir, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts, { sortBy: 'title' })
    const guide = sb.find((s) => s.text === 'Quick Guide')
    // 'Advanced' < 'Getting Started' 字母序
    expect(guide?.items?.[0]?.text).toBe('Advanced')
  })

  it('collapsed=false 让所有 group 默认展开', () => {
    const opts = resolveOptions({ srcDir: tmpDir, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts, { collapsed: false })
    for (const s of sb) {
      if (s.items) expect(s.collapsed).toBe(false)
    }
  })

  it('视图模块的 _perspectives_ 目录自动排除', () => {
    // 模拟视图生成后的状态:在 tmp vault 里建 _perspectives_/stats.md
    const persp = nodePath.join(tmpDir, '_perspectives_')
    fs.mkdirSync(persp, { recursive: true })
    fs.writeFileSync(
      nodePath.join(persp, 'stats.md'),
      '# Stats\n',
      'utf8',
    )
    const opts = resolveOptions({ srcDir: tmpDir, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts)
    const found = findRec(sb, 'Stats')
    expect(found).toBeNull()
    // cleanup
    fs.rmSync(persp, { recursive: true, force: true })
  })
})

function findRec(items: SidebarItem[], text: string): SidebarItem | null {
  for (const it of items) {
    if (it.text === text) return it
    if (it.items) {
      const r = findRec(it.items, text)
      if (r) return r
    }
  }
  return null
}
