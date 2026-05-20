/**
 * v0.3 — _sidebar.md 解析 + generateFolderIndexes + scanWikilinks +
 *        resolver 相对路径 fallback + views.injectInto。
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import nodePath from 'node:path'
import os from 'node:os'

import { resolveOptions } from '../src/core/config-bridge.js'
import { scanVault } from '../src/core/vault/index.js'
import { generateSidebar } from '../src/core/sidebar-auto/index.js'
import {
  generateFolderIndexes,
  FOLDER_INDEX_SENTINEL,
} from '../src/core/sidebar-auto/index.js'
import { parseSidebarOverride } from '../src/core/sidebar-auto/parse-sidebar-md.js'
import { scanWikilinks } from '../src/core/scan-wikilinks.js'
import { resolveWikilink } from '../src/core/resolver.js'
import { injectViewsSidebar } from '../src/core/views/sidebar-inject.js'
import type { SidebarItem } from '../src/core/sidebar-auto/index.js'

function write(p: string, c: string): void {
  fs.mkdirSync(nodePath.dirname(p), { recursive: true })
  fs.writeFileSync(p, c, 'utf8')
}

// ── _sidebar.md ────────────────────────────────────────────────

describe('_sidebar.md 手动覆盖', () => {
  let tmp: string
  beforeAll(() => {
    tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-side-'))
    write(nodePath.join(tmp, 'index.md'), '# Root\n')
    write(nodePath.join(tmp, 'guide', 'overview.md'), '---\ntitle: Overview\n---\nbody\n')
    write(nodePath.join(tmp, 'guide', 'install.md'), '---\ntitle: Install\n---\nbody\n')
    write(nodePath.join(tmp, 'guide', 'configure.md'), '---\ntitle: Configure\n---\nbody\n')
    // _sidebar.md 用 markdown list 写
    write(
      nodePath.join(tmp, 'guide', '_sidebar.md'),
      [
        '---',
        'title: Guide sidebar',
        '---',
        '',
        '- [[overview|🚀 概览]]',
        '- 文档 +',
        '  - [[install|安装]]',
        '  - [[configure|配置]]',
        '- [外链](https://example.com)',
        '',
      ].join('\n'),
    )
  })
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it('_sidebar.md 完全替换该目录的 sidebar 内容', () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts, { layout: 'tree' }) as SidebarItem[]
    const guide = sb.find((s) => s.text === 'Guide')!
    expect(guide.items?.length).toBe(3)
    expect(guide.items?.[0]?.text).toBe('🚀 概览')
    expect(guide.items?.[1]?.text).toBe('文档')
    expect(guide.items?.[1]?.items?.length).toBe(2)
    expect(guide.items?.[1]?.collapsed).toBe(false) // + 后缀
    expect(guide.items?.[2]?.link).toBe('https://example.com')
  })

  it('_sidebar.md 不出现在 sidebar items 里', () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts, { layout: 'tree' }) as SidebarItem[]
    // 不应在任何位置出现 '_sidebar' 文字
    const json = JSON.stringify(sb)
    expect(json).not.toMatch(/_sidebar/i)
  })

  it('parseSidebarOverride frontmatter.sidebar 数组形式', () => {
    const tmp2 = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-side2-'))
    write(nodePath.join(tmp2, 'foo.md'), '# Foo\n')
    write(
      nodePath.join(tmp2, '_sidebar.md'),
      [
        '---',
        'sidebar:',
        '  - text: 自定义',
        '    link: /foo',
        '---',
        '',
      ].join('\n'),
    )
    const opts = resolveOptions({ srcDir: tmp2, cleanUrls: true })
    const idx = scanVault(opts)
    const entry = idx.byBasename.get('_sidebar')?.[0]
    expect(entry).toBeDefined()
    const parsed = parseSidebarOverride(entry!, idx, opts)
    expect(parsed).toEqual([{ text: '自定义', link: '/foo' }])
    fs.rmSync(tmp2, { recursive: true, force: true })
  })
})

// ── generateFolderIndexes ──────────────────────────────────────

describe('generateFolderIndexes 三模式', () => {
  let tmp: string
  beforeAll(() => {
    tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-fi-'))
    write(nodePath.join(tmp, 'index.md'), '# Root\n')
    // 顶级 a/:无 index
    write(nodePath.join(tmp, 'a', 'page1.md'), '# P1\n')
    write(nodePath.join(tmp, 'a', 'page2.md'), '# P2\n')
    // 顶级 b/:有 index(用户文件)
    write(nodePath.join(tmp, 'b', 'index.md'), '# user b index\n')
    write(nodePath.join(tmp, 'b', 'inner.md'), '# inner\n')
    // 嵌套 a/sub/:无 index
    write(nodePath.join(tmp, 'a', 'sub', 'child.md'), '# child\n')
    // _drafts 应被忽略
    write(nodePath.join(tmp, '_drafts', 'wip.md'), '# wip\n')
  })
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it("mode='off' 不生成任何 index", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const r = generateFolderIndexes(opts, { mode: 'off' })
    expect(r.written.length).toBe(0)
  })

  it("mode='top-level' 仅给顶级目录建 index", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const r = generateFolderIndexes(opts, { mode: 'top-level' })
    const writtenRels = r.written.map((p) => nodePath.relative(tmp, p))
    expect(writtenRels).toContain('a/index.md')
    // b 已有用户 index → 跳过
    expect(writtenRels).not.toContain('b/index.md')
    // 嵌套子目录 a/sub/ 不应生成
    expect(writtenRels).not.toContain(nodePath.join('a', 'sub', 'index.md'))
    // 写出的文件含 sentinel
    const content = fs.readFileSync(r.written[0]!, 'utf8')
    expect(content).toContain(FOLDER_INDEX_SENTINEL)
    // cleanup
    for (const p of r.written) fs.unlinkSync(p)
  })

  it("mode='all' 所有非空非 _ 目录都生成", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const r = generateFolderIndexes(opts, { mode: 'all' })
    const writtenRels = r.written.map((p) => nodePath.relative(tmp, p))
    expect(writtenRels).toContain('a/index.md')
    expect(writtenRels).toContain(nodePath.join('a', 'sub', 'index.md'))
    // _drafts 仍不生成
    expect(writtenRels.some((p) => p.startsWith('_drafts'))).toBe(false)
    // b 仍跳过
    expect(writtenRels).not.toContain('b/index.md')
    for (const p of r.written) fs.unlinkSync(p)
  })

  it('不覆盖空 frontmatter-only 的用户文件', () => {
    const tmp2 = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-fi2-'))
    write(nodePath.join(tmp2, 'c', 'page.md'), '# p\n')
    // 空 dirIndex(只有 frontmatter)
    write(nodePath.join(tmp2, 'c', 'c.md'), '---\nsidebarTitle: C Custom\n---\n')
    const opts = resolveOptions({ srcDir: tmp2, cleanUrls: true })
    const r = generateFolderIndexes(opts, { mode: 'top-level' })
    expect(r.written.length).toBe(0)
    expect(r.skipped.some((s) => s.reason.includes('c.md'))).toBe(true)
    fs.rmSync(tmp2, { recursive: true, force: true })
  })
})

// ── scanWikilinks ──────────────────────────────────────────────

describe('scanWikilinks 死链预扫', () => {
  it('跳过 code block 内的 [[note]] 不报死链', () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-sw-'))
    write(nodePath.join(tmp, 'real.md'), '# Real\n')
    write(
      nodePath.join(tmp, 'doc.md'),
      [
        '# Doc',
        '',
        '```md',
        '[[fake-in-fenced-code]]',
        '![[also-fake.png]]',
        '```',
        '',
        '行内 `[[fake-inline-code]]` 也不算',
        '',
        '真链:[[real]]',
        '',
        '真死链:[[really-missing]]',
        '',
      ].join('\n'),
    )
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const report = scanWikilinks(idx, opts)
    // dead 应该只有 'really-missing'(`[[real]]` 找到了)
    expect(report.dead.map((d) => d.target)).toEqual(['really-missing'])
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  it("相对当前文件目录的 [[deep/path]] fallback 解析", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-rel-'))
    // ctx 在 sub/index.md;target 写 deep/leaf,实际位于 sub/deep/leaf.md
    write(nodePath.join(tmp, 'sub', 'index.md'), '[[deep/leaf]]\n')
    write(nodePath.join(tmp, 'sub', 'deep', 'leaf.md'), '# Leaf\n')
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const report = scanWikilinks(idx, opts)
    // 应该不报死链(scanWikilinks 也实现了 fallback)
    expect(report.dead.length).toBe(0)
    fs.rmSync(tmp, { recursive: true, force: true })
  })
})

// ── resolver 相对路径 fallback ─────────────────────────────────

describe('resolveWikilink 相对当前 source 文件的 fallback', () => {
  it("含 / 找不到绝对路径时,fallback 到 currentSourcePath 所在目录", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-res-'))
    write(nodePath.join(tmp, 'misc', 'parent.md'), '# parent\n')
    write(nodePath.join(tmp, 'misc', 'deep', 'a', 'b', 'leaf.md'), '# leaf\n')
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const parentAbs = nodePath.join(tmp, 'misc', 'parent.md')
    // wikilink 'deep/a/b/leaf' 写在 misc/parent.md 里 → fallback 应找到
    const r = resolveWikilink('deep/a/b/leaf', idx, opts, 'page', parentAbs)
    expect(r.isDead).toBe(false)
    expect(r.url).toContain('/misc/deep/a/b/leaf')
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  it("没有 currentSourcePath 时只查绝对路径(原有行为)", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-res2-'))
    write(nodePath.join(tmp, 'misc', 'deep', 'leaf.md'), '# leaf\n')
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const r = resolveWikilink('deep/leaf', idx, opts) // 无 currentSourcePath
    expect(r.isDead).toBe(true)
    fs.rmSync(tmp, { recursive: true, force: true })
  })
})

// ── views.injectInto ───────────────────────────────────────────

describe('views.injectInto 四模式', () => {
  function buildOptions(injectInto: 'sidebar' | 'nav' | 'both' | 'off') {
    return resolveOptions({
      srcDir: '.',
      cleanUrls: true,
      views: { injectInto },
    })
  }

  it("'sidebar':在 per-folder sidebar 末尾追加 Perspectives 组", () => {
    const opts = buildOptions('sidebar')
    const sidebar = { '/guide/': [{ text: 'A', link: '/a' }] }
    const r = injectViewsSidebar(sidebar, opts) as Record<string, SidebarItem[]>
    expect(r['/guide/']?.some((s) => s.text === 'Perspectives')).toBe(true)
  })

  it("'nav':不污染 sidebar 主内容,但 /_perspectives_/ 仍有 fallback sidebar", () => {
    const opts = buildOptions('nav')
    const sidebar = { '/guide/': [{ text: 'A', link: '/a' }] }
    const r = injectViewsSidebar(sidebar, opts) as Record<string, SidebarItem[]>
    expect(r['/guide/']?.some((s) => s.text === 'Perspectives')).toBe(false)
    expect(r['/_perspectives_/']).toBeDefined()
  })

  it("'off':什么都不动,但 /_perspectives_/ 仍有 fallback", () => {
    const opts = buildOptions('off')
    const sidebar = { '/guide/': [{ text: 'A', link: '/a' }] }
    const r = injectViewsSidebar(sidebar, opts) as Record<string, SidebarItem[]>
    expect(r['/guide/']?.some((s) => s.text === 'Perspectives')).toBe(false)
    // off 仍然加 _perspectives_/ key(用户可能从 nav 之外的方式访问视图)
    expect(r['/_perspectives_/']).toBeDefined()
  })

  it("'both':sidebar 加 + nav 由 wrapper 另外加(这里不测 nav)", () => {
    const opts = buildOptions('both')
    const sidebar = { '/guide/': [{ text: 'A', link: '/a' }] }
    const r = injectViewsSidebar(sidebar, opts) as Record<string, SidebarItem[]>
    expect(r['/guide/']?.some((s) => s.text === 'Perspectives')).toBe(true)
    expect(r['/_perspectives_/']).toBeDefined()
  })
})
