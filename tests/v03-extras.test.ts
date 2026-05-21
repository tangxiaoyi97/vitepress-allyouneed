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
// v0.3.10:generateFolderIndexes / FOLDER_INDEX_SENTINEL 已删除
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

// v0.3.10:generateFolderIndexes 测试块整个删除 — autoFolderIndex 功能不再存在

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

// ── foldersFirst:同一层 files vs folders 的相对位置 ─────────────

describe('sidebarAuto.foldersFirst', () => {
  let tmp: string
  beforeAll(() => {
    tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-ff-'))
    // 根:1 个文件 + 1 个子目录
    write(nodePath.join(tmp, 'alpha.md'), '---\ntitle: Alpha\n---\nbody\n')
    write(nodePath.join(tmp, 'sub', 'index.md'), '---\ntitle: Sub\n---\nbody\n')
    write(nodePath.join(tmp, 'sub', 'inner.md'), '---\ntitle: Inner\n---\nbody\n')
  })
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it('默认 false:同层 files 在 folders 之前', () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts, { layout: 'tree' }) as SidebarItem[]
    // 顶层应为 [Alpha(file), Sub(group)]
    expect(sb[0]?.text).toBe('Alpha')
    expect(sb[1]?.text).toBe('Sub')
    expect(sb[1]?.items).toBeDefined()
  })

  it("foldersFirst: true:folders 在 files 之前", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts, {
      layout: 'tree',
      foldersFirst: true,
    }) as SidebarItem[]
    expect(sb[0]?.text).toBe('Sub')
    expect(sb[0]?.items).toBeDefined()
    expect(sb[1]?.text).toBe('Alpha')
  })
})
