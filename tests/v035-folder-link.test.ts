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
// v0.3.10:autoFolderIndex removed; generateFolderIndexes/FOLDER_INDEX_SENTINEL gone
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

// v0.3.10:F2 默认模板测试已删除 —— autoFolderIndex feature 整个移除
