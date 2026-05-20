/**
 * v0.3.5 — folderLinkFallback + 新 index 模板的测试。
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
import {
  generateFolderIndexes,
  FOLDER_INDEX_SENTINEL,
} from '../src/core/sidebar-auto/index.js'
import { resolveWikilink } from '../src/core/resolver.js'
import type { SidebarItem } from '../src/core/sidebar-auto/index.js'

function write(p: string, c: string): void {
  fs.mkdirSync(nodePath.dirname(p), { recursive: true })
  fs.writeFileSync(p, c, 'utf8')
}

// ── F1: folderLinkFallback ────────────────────────────────────────

describe('F1: folderLinkFallback (sidebar/nav 兜底)', () => {
  let tmp: string
  beforeAll(() => {
    tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-f1-'))
    // guide/ 无 index,只有 install.md + setup.md
    write(nodePath.join(tmp, 'guide', 'install.md'), '---\norder: 1\n---\nA\n')
    write(nodePath.join(tmp, 'guide', 'setup.md'), '---\norder: 2\n---\nB\n')
    write(nodePath.join(tmp, 'index.md'), '# Home')
  })
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it("default folderLinkFallback='first-file':无 index 的 group 也能点(链到 install.md)", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts, { layout: 'tree' }) as SidebarItem[]
    const guide = sb.find((s) => s.text === 'Guide')!
    expect(guide).toBeDefined()
    // group 应该有 link,且指向 install(order=1)或 setup(取第一个)
    expect(guide.link).toBeTruthy()
    expect(guide.link).toMatch(/guide\/install$/)
  })

  it("folderLinkFallback='none':无 index 的 group 不可点(老行为)", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const sb = generateSidebar(idx, opts, {
      layout: 'tree',
      folderLinkFallback: 'none',
    }) as SidebarItem[]
    const guide = sb.find((s) => s.text === 'Guide')!
    expect(guide).toBeDefined()
    expect(guide.link).toBeUndefined()
  })

  it("nav 在 'first-file' 模式下也能生成 tab(老逻辑同行为)", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const nav = generateNav(idx, opts, {})
    const guide = nav.find((n) => n.text === 'Guide')
    expect(guide).toBeDefined()
    expect(guide?.link).toMatch(/guide\/install$/)
  })

  it("nav 在 'none' 模式 + 无 index:不应该出现 tab", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const nav = generateNav(idx, opts, { folderLinkFallback: 'none' })
    expect(nav.find((n) => n.text === 'Guide')).toBeUndefined()
  })
})

// ── F1.3: [[folder/]] wikilink fallback ────────────────────────────

describe('F1.3: [[folder/]] wikilink 兜底', () => {
  let tmp: string
  beforeAll(() => {
    tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-f13-'))
    write(nodePath.join(tmp, 'Themen', 'A.md'), '# A')
    write(nodePath.join(tmp, 'Themen', 'B.md'), '# B')
    write(nodePath.join(tmp, 'WithIndex', 'index.md'), '# Idx')
    write(nodePath.join(tmp, 'WithIndex', 'other.md'), '# Other')
  })
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it("default first-file:[[Themen/]] 落到第一个文件", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const r = resolveWikilink('Themen/', idx, opts)
    expect(r.isDead).toBe(false)
    expect(r.url).toMatch(/Themen\/A$/)
  })

  it("default first-file:label 是文件夹名(Themen),不是 first file 的 basename", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const r = resolveWikilink('Themen/', idx, opts)
    expect(r.defaultLabel).toBe('Themen')
  })

  it("有 index 的文件夹:[[WithIndex/]] 仍走 index(优先级高)", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const r = resolveWikilink('WithIndex/', idx, opts)
    expect(r.isDead).toBe(false)
    expect(r.url).toMatch(/WithIndex\/$|WithIndex$/)
    expect(r.defaultLabel).toBe('WithIndex')
  })

  it("folderLinkFallback='none' 时:[[Themen/]] 死链", () => {
    const opts = resolveOptions({
      srcDir: tmp,
      cleanUrls: true,
      sidebarAuto: { folderLinkFallback: 'none' },
    })
    const idx = scanVault(opts)
    const r = resolveWikilink('Themen/', idx, opts)
    expect(r.isDead).toBe(true)
  })
})

// ── F2: 新默认模板 ─────────────────────────────────────────────────

describe('F2: defaultTemplate 新样式', () => {
  let tmp: string
  beforeAll(() => {
    tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-f2-'))
    write(nodePath.join(tmp, 'A.md'), '# A')
    write(nodePath.join(tmp, 'B.md'), '# B')
    write(nodePath.join(tmp, 'sub1', 'x.md'), '# X')
    write(nodePath.join(tmp, 'sub2', 'y.md'), '# Y')
  })
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it('子文件夹在前 (Folders) ,文件在后 (Files)', () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    generateFolderIndexes(opts, { mode: 'top-level' })
    const rootIdx = fs.readFileSync(nodePath.join(tmp, 'index.md'), 'utf8')
    expect(rootIdx).toContain(FOLDER_INDEX_SENTINEL)
    // Folders 段在前
    const folderIdx = rootIdx.indexOf('## Folders')
    const fileIdx = rootIdx.indexOf('## Files')
    expect(folderIdx).toBeGreaterThan(-1)
    expect(fileIdx).toBeGreaterThan(-1)
    expect(folderIdx).toBeLessThan(fileIdx)
    // 子文件夹用 wikilink(默认 groupLink='all')
    expect(rootIdx).toMatch(/- \[\[sub1\/\|Sub1\]\]/)
    expect(rootIdx).toMatch(/- \[\[sub2\/\|Sub2\]\]/)
    // 文件
    expect(rootIdx).toMatch(/- \[\[A\|A\]\]/)
    expect(rootIdx).toMatch(/- \[\[B\|B\]\]/)
  })

  it("groupLink='off' 时:子文件夹纯文字标题", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    generateFolderIndexes(opts, { mode: 'top-level', groupLink: 'off' })
    const rootIdx = fs.readFileSync(nodePath.join(tmp, 'index.md'), 'utf8')
    // 不应该有 [[sub1/|...]]
    expect(rootIdx).not.toMatch(/\[\[sub1\//)
    // 应有纯文字
    expect(rootIdx).toMatch(/- Sub1/)
    expect(rootIdx).toMatch(/- Sub2/)
  })

  it("groupLink='top-level':根 index 内可点,深层 index 内不可点", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    // 加深度:sub1/inner/z.md
    write(nodePath.join(tmp, 'sub1', 'inner', 'z.md'), '# Z')
    generateFolderIndexes(opts, { mode: 'all', groupLink: 'top-level' })
    const rootIdx = fs.readFileSync(nodePath.join(tmp, 'index.md'), 'utf8')
    const sub1Idx = fs.readFileSync(nodePath.join(tmp, 'sub1', 'index.md'), 'utf8')
    // 根:子文件夹用 wikilink
    expect(rootIdx).toMatch(/\[\[sub1\//)
    // sub1/index.md:深层,子文件夹纯文字(inner 不可点)
    expect(sub1Idx).not.toMatch(/\[\[sub1\/inner/)
    expect(sub1Idx).toMatch(/- Inner/)
  })
})
