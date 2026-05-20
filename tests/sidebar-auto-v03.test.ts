/**
 * v0.3 — sidebar 自动生成扩展测试(覆盖所有 v0.3 新功能)。
 *
 * 涵盖:
 *   - layout: 'tree' 嵌套
 *   - layout: 'flat' 扁平
 *   - layout: 'per-folder' Record 输出
 *   - groupOrder 顶级排序覆盖
 *   - maxDepth 限制
 *   - stripNumericPrefix
 *   - dirIndex 优先级:<folder>.md > index.md > README.md
 *   - 空 frontmatter-only dirIndex 不当 link
 *   - sidebarCollapsed frontmatter
 *   - sidebarGroup 虚拟分组
 *   - groupLink: 'all' / 'top-level' / 'off'
 *   - findFirstPageUrl fallback(无 dirIndex 时根 sidebar 仍可点)
 *   - generateNav 自动 nav tabs
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import nodePath from 'node:path'
import os from 'node:os'

import { resolveOptions } from '../src/core/config-bridge.js'
import { scanVault } from '../src/core/vault/index.js'
import {
  generateSidebar,
  generateNav,
} from '../src/core/sidebar-auto/index.js'
import type { SidebarItem, NavItem } from '../src/core/sidebar-auto/index.js'

function write(p: string, content: string): void {
  fs.mkdirSync(nodePath.dirname(p), { recursive: true })
  fs.writeFileSync(p, content, 'utf8')
}

/** 一个 medium-sized vault 覆盖大多数测试需求 */
function makeRichVault(dir: string): void {
  // 根
  write(nodePath.join(dir, 'index.md'), '---\ntitle: Home\n---\n# Home\n')
  // tour 目录:有 dirIndex 同名(tour.md)
  write(
    nodePath.join(dir, 'tour', 'tour.md'),
    '---\nsidebarTitle: Tour\nsidebarCollapsed: false\n---\n# Tour 同名 index\n',
  )
  write(nodePath.join(dir, 'tour', 'v03-tour.md'), '---\ntitle: v0.3 Tour\norder: 1\n---\n# v0.3 Tour\n')
  // tour/changelog:只有 index.md
  write(
    nodePath.join(dir, 'tour', 'changelog', 'index.md'),
    '---\ntitle: Changelog\n---\n# Changelog\n',
  )
  write(nodePath.join(dir, 'tour', 'changelog', 'v0.1.md'), '---\ntitle: v0.1\norder: 1\n---\nv0.1\n')
  write(nodePath.join(dir, 'tour', 'changelog', 'v0.2.md'), '---\ntitle: v0.2\norder: 2\n---\nv0.2\n')

  // guide 目录:没 dirIndex(测 fallback)
  write(nodePath.join(dir, 'guide', 'overview.md'), '---\ntitle: Guide Overview\norder: 1\n---\n# Overview\n')
  write(nodePath.join(dir, 'guide', 'docs', 'install.md'), '---\ntitle: Install\norder: 1\n---\n')
  write(nodePath.join(dir, 'guide', 'docs', 'configure.md'), '---\ntitle: Configure\norder: 2\n---\n')
  // 一个虚拟 group 文件(sidebarGroup)
  write(
    nodePath.join(dir, 'guide', 'advanced', 'custom.md'),
    '---\ntitle: Custom theme\nsidebarGroup: Customization\norder: 1\n---\n',
  )
  write(nodePath.join(dir, 'guide', 'advanced', 'recipes.md'), '---\ntitle: Recipes\norder: 2\n---\n')

  // test 目录:有空 frontmatter-only dirIndex
  write(
    nodePath.join(dir, 'test', 'test.md'),
    '---\nsidebarTitle: Test Suite\n---\n',  // 注意:正文为空!
  )
  write(nodePath.join(dir, 'test', 'a.md'), '---\ntitle: A\n---\nbody\n')
  write(nodePath.join(dir, 'test', 'b.md'), '---\ntitle: B\n---\nbody\n')

  // 数字前缀目录 + 文件(测 stripNumericPrefix)
  write(nodePath.join(dir, '01-numbered', '01-first.md'), '---\ntitle: First\n---\nbody\n')
  write(nodePath.join(dir, '01-numbered', '02-second.md'), '---\ntitle: Second\n---\nbody\n')
}

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

describe('sidebar-auto v0.3 — layout & dirIndex', () => {
  let tmp: string

  beforeAll(() => {
    tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-sb-v3-'))
    makeRichVault(tmp)
  })
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it('layout=tree 嵌套子目录变成子组', () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts, { layout: 'tree' }) as SidebarItem[]
    expect(Array.isArray(sb)).toBe(true)
    const tour = sb.find((s) => s.text === 'Tour')
    expect(tour).toBeDefined()
    // tour/changelog 应该作为 tour 的子组
    const changelog = tour?.items?.find((s) => s.text === 'Changelog')
    expect(changelog).toBeDefined()
    expect(changelog?.items?.length).toBe(2)
  })

  it('layout=flat 顶层平铺所有目录', () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts, { layout: 'flat' }) as SidebarItem[]
    // tour/changelog 应该是顶层 group(而不是嵌套在 Tour 下)
    expect(sb.some((s) => s.text === 'Changelog')).toBe(true)
  })

  it('layout=per-folder 输出 Record', () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts, { layout: 'per-folder' }) as Record<
      string,
      SidebarItem[]
    >
    expect(typeof sb).toBe('object')
    expect(Array.isArray(sb)).toBe(false)
    // 根
    expect(sb['/']).toBeDefined()
    // 每个顶级目录单独 key
    expect(sb['/tour/']).toBeDefined()
    expect(sb['/guide/']).toBeDefined()
    expect(sb['/test/']).toBeDefined()
  })

  it('per-folder 子组应可 toggle:有 items 有 collapsed 字段', () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts, { layout: 'per-folder' }) as Record<
      string,
      SidebarItem[]
    >
    const tourSb = sb['/tour/']!
    // tour sidebar 应该是**展开成多个 sibling items**,不是单一 group
    // changelog 是其中一项
    const changelog = tourSb.find((s) => s.text === 'Changelog')
    expect(changelog).toBeDefined()
    expect(changelog?.items).toBeDefined()
    expect(typeof changelog?.collapsed).toBe('boolean') // 有 collapsed 才能 toggle
  })
})

describe('sidebar-auto v0.3 — dirIndex priority', () => {
  let tmp: string
  beforeAll(() => {
    tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-sb-dir-'))
    makeRichVault(tmp)
  })
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it('<folder>.md 优先级高于 index.md', () => {
    // tour/ 有 tour.md(同名)+ 无 index.md → 同名优先,group link = tour.md.url
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts, { layout: 'tree' }) as SidebarItem[]
    const tour = sb.find((s) => s.text === 'Tour')
    expect(tour?.link).toBeDefined()
    expect(tour?.link).toContain('/tour/tour')
  })

  it('空 frontmatter-only dirIndex 不带 link 但 frontmatter 生效', () => {
    // test/test.md 只有 frontmatter,正文为空
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts, { layout: 'tree' }) as SidebarItem[]
    const test = sb.find((s) => s.text === 'Test Suite') // 用了 sidebarTitle
    expect(test).toBeDefined()
    expect(test?.link).toBeUndefined() // 不带 link
    expect(test?.items?.length).toBe(2) // a + b
  })
})

describe('sidebar-auto v0.3 — sortBy / groupOrder / stripNumericPrefix', () => {
  let tmp: string
  beforeAll(() => {
    tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-sb-sort-'))
    makeRichVault(tmp)
  })
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it('groupOrder 顶级排序覆盖字母序', () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    // test/ 下 test.md 有 sidebarTitle: 'Test Suite',所以 group text 是 'Test Suite'
    // groupOrder 匹配 dirname('test')或 group text('Test Suite'),两种都行
    const sb = generateSidebar(idx, opts, {
      layout: 'tree',
      groupOrder: ['Tour', 'Guide', 'test'],
    }) as SidebarItem[]
    const groups = sb.filter((s) =>
      ['Tour', 'Guide', 'Test Suite'].includes(s.text ?? ''),
    )
    expect(groups.map((g) => g.text)).toEqual(['Tour', 'Guide', 'Test Suite'])
  })

  it('stripNumericPrefix 默认 true:01-first.md 显示为 First', () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts, { layout: 'tree' }) as SidebarItem[]
    const numbered = sb.find((s) => s.text === 'Numbered')
    expect(numbered).toBeDefined()
    // 子项的 title fallback 走 frontmatter.title('First'/'Second')
    expect(numbered?.items?.[0]?.text).toBe('First')
  })

  it('stripNumericPrefix=false 保留 01-foo 原样', () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts, {
      layout: 'tree',
      stripNumericPrefix: false,
    }) as SidebarItem[]
    const numbered = sb.find((s) => s.text === '01 Numbered')
    expect(numbered).toBeDefined()
  })

  it('maxDepth 限制嵌套', () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts, {
      layout: 'tree',
      maxDepth: 1,
    }) as SidebarItem[]
    const tour = sb.find((s) => s.text === 'Tour')
    // tour 自身 = depth 0;changelog 是它的子级 = depth 1;changelog 内部不展开
    const changelog = tour?.items?.find((s) => s.text === 'Changelog')
    if (changelog) {
      // depth 1 自身被渲染,但它的 items(v0.1/v0.2)在 depth 2 被截断
      expect(changelog.items?.length ?? 0).toBe(0)
    }
  })
})

describe('sidebar-auto v0.3 — groupLink 三模式', () => {
  let tmp: string
  beforeAll(() => {
    tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-sb-link-'))
    makeRichVault(tmp)
  })
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it("groupLink='all'(默认):所有有 dirIndex 的 group 都带 link", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts, { layout: 'tree' }) as SidebarItem[]
    const tour = sb.find((s) => s.text === 'Tour')
    expect(tour?.link).toBeDefined()
    const changelog = tour?.items?.find((s) => s.text === 'Changelog')
    expect(changelog?.link).toBeDefined()
  })

  it("groupLink='top-level':子组不带 link,只能展开/折叠", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts, {
      layout: 'tree',
      groupLink: 'top-level',
    }) as SidebarItem[]
    const tour = sb.find((s) => s.text === 'Tour')
    expect(tour?.link).toBeDefined() // 顶级 ✓
    const changelog = tour?.items?.find((s) => s.text === 'Changelog')
    expect(changelog?.link).toBeUndefined() // 子组 ✗
  })

  it("groupLink='off':所有 group 都不带 link", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts, {
      layout: 'tree',
      groupLink: 'off',
    }) as SidebarItem[]
    const tour = sb.find((s) => s.text === 'Tour')
    expect(tour?.link).toBeUndefined()
  })
})

describe('sidebar-auto v0.3 — sidebarGroup 虚拟分组', () => {
  let tmp: string
  beforeAll(() => {
    tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-sb-vg-'))
    makeRichVault(tmp)
  })
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it('sidebarGroup 把文件抽到命名虚拟组', () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts, { layout: 'tree' }) as SidebarItem[]
    // guide/advanced/custom.md 写了 sidebarGroup: 'Customization'
    // 它应该出现在 guide → advanced → Customization 虚拟组里(而不是直接在 advanced 下)
    const customization = findRec(sb, 'Customization')
    expect(customization).not.toBeNull()
    expect(customization?.items?.some((i) => i.text === 'Custom theme')).toBe(true)
  })
})

describe('sidebar-auto v0.3 — per-folder + autoNav 配合', () => {
  let tmp: string
  beforeAll(() => {
    tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-sb-nav-'))
    makeRichVault(tmp)
  })
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it('generateNav 顶级目录变 nav tabs', () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const nav: NavItem[] = generateNav(idx, opts, {
      layout: 'per-folder',
      autoNav: true,
    })
    expect(nav.length).toBeGreaterThan(0)
    expect(nav[0]?.text).toBe('Home')
    expect(nav.some((n) => n.text === 'Tour')).toBe(true)
    expect(nav.some((n) => n.text === 'Guide')).toBe(true)
    // test/ 的 dirIndex 是 test.md(sidebarTitle: 'Test Suite')→ nav 用这个标题
    expect(nav.some((n) => n.text === 'Test Suite')).toBe(true)
  })

  it("homeNavText 自定义", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const nav = generateNav(idx, opts, {
      layout: 'per-folder',
      autoNav: true,
      homeNavText: '首页',
    })
    expect(nav[0]?.text).toBe('首页')
  })

  it('per-folder 根 sidebar 含每个顶级目录的入口(可点)', () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts, {
      layout: 'per-folder',
    }) as Record<string, SidebarItem[]>
    const root = sb['/']!
    // 应该看到 Tour/Guide/Test 等顶层入口
    const tourEntry = root.find((it) => it.text === 'Tour')
    expect(tourEntry?.link).toBeDefined() // 有 dirIndex 同名 → 可点
    const guideEntry = root.find((it) => it.text === 'Guide')
    expect(guideEntry?.link).toBeDefined() // 无 dirIndex → fallback 到第一个 page
  })
})
