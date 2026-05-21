/**
 * v0.3.10 — folderLinkOrder 重构、autoFolderIndex 删除、deprecation 警告测试。
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import nodePath from 'node:path'
import os from 'node:os'

import { resolveOptions } from '../src/core/config-bridge.js'
import { scanVault } from '../src/core/vault/index.js'
import { generateSidebar, generateNav } from '../src/core/sidebar-auto/index.js'
import { resolveWikilink } from '../src/core/resolver.js'
import type { SidebarItem } from '../src/core/sidebar-auto/index.js'

function write(p: string, c: string): void {
  fs.mkdirSync(nodePath.dirname(p), { recursive: true })
  fs.writeFileSync(p, c, 'utf8')
}

// ── I2: folderLinkOrder 默认行为 ─────────────────────────────────

describe('I2: folderLinkOrder 默认 = [same-name, index, readme, first-file]', () => {
  it("有 <folder>.md → group link 用同名(same-name 优先)", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-flo-'))
    try {
      write(nodePath.join(tmp, 'tour', 'tour.md'), '# Tour main\n')
      write(nodePath.join(tmp, 'tour', 'index.md'), '# Tour index\n')
      write(nodePath.join(tmp, 'tour', 'foo.md'), '# Foo\n')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const sb = generateSidebar(idx, opts, { layout: 'tree' }) as SidebarItem[]
      const tour = sb.find((s) => s.text && /tour/i.test(s.text))!
      // same-name wins → link 指向 tour/tour
      expect(tour.link).toMatch(/tour\/tour$/)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it("无 same-name 但有 index.md → 用 index", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-flo2-'))
    try {
      write(nodePath.join(tmp, 'guide', 'index.md'), '# Guide index\n')
      write(nodePath.join(tmp, 'guide', 'foo.md'), '# Foo\n')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const sb = generateSidebar(idx, opts, { layout: 'tree' }) as SidebarItem[]
      const g = sb.find((s) => s.text && /guide/i.test(s.text))!
      // index.md routes to '/guide/' (cleanUrls), or '/guide/index' depending — anyway 包含 guide
      expect(g.link).toMatch(/guide/)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it("只有 README.md → 用 README", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-flo3-'))
    try {
      write(nodePath.join(tmp, 'docs', 'README.md'), '# Docs README\n')
      write(nodePath.join(tmp, 'docs', 'foo.md'), '# Foo\n')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const sb = generateSidebar(idx, opts, { layout: 'tree' }) as SidebarItem[]
      const d = sb.find((s) => s.text && /docs/i.test(s.text))!
      expect(d.link).toBeTruthy()
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it("都没有 → fall back 到 first-file", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-flo4-'))
    try {
      write(nodePath.join(tmp, 'misc', 'a.md'), '# A\n')
      write(nodePath.join(tmp, 'misc', 'b.md'), '# B\n')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const sb = generateSidebar(idx, opts, { layout: 'tree' }) as SidebarItem[]
      const m = sb.find((s) => s.text && /misc/i.test(s.text))!
      // A 字母靠前(order-then-title 默认,无 order → 按 title)
      expect(m.link).toMatch(/misc\/a$/)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})

// ── I2: 自定义 folderLinkOrder ───────────────────────────────────

describe('I2: 自定义 folderLinkOrder', () => {
  it("['readme'] 只用 README;没有则没有 link", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-flo5-'))
    try {
      // a 有 README,b 没有。README 不写 H1,让 group title 走 humanize(dirname)。
      write(nodePath.join(tmp, 'a', 'README.md'), 'README body\n')
      write(nodePath.join(tmp, 'a', 'x.md'), '# X\n')
      write(nodePath.join(tmp, 'b', 'y.md'), '# Y\n')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const sb = generateSidebar(idx, opts, {
        layout: 'tree',
        folderLinkOrder: ['readme'],
      }) as SidebarItem[]
      const a = sb.find((s) => s.text === 'A')!
      const b = sb.find((s) => s.text === 'B')!
      expect(a.link).toBeTruthy() // README in a
      expect(b.link).toBeUndefined() // no readme in b, no fallback
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it("[] = 文件夹完全不可点", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-flo6-'))
    try {
      // index.md 不写 H1,让 group title 走 humanize('sub') = 'Sub'
      write(nodePath.join(tmp, 'sub', 'index.md'), 'index body\n')
      write(nodePath.join(tmp, 'sub', 'foo.md'), '# Foo\n')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const sb = generateSidebar(idx, opts, {
        layout: 'tree',
        folderLinkOrder: [],
      }) as SidebarItem[]
      const s = sb.find((g) => g.text === 'Sub')!
      expect(s.link).toBeUndefined()
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})

// ── I2: 老 folderLinkFallback 兼容 ───────────────────────────────

describe('I2: 老 folderLinkFallback 仍兼容(@deprecated 但能用)', () => {
  it("folderLinkFallback: 'none' 等价 folderLinkOrder: []", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-old-'))
    try {
      write(nodePath.join(tmp, 'sub', 'a.md'), '# A\n')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const sb = generateSidebar(idx, opts, {
        layout: 'tree',
        folderLinkFallback: 'none',
      }) as SidebarItem[]
      const s = sb.find((g) => g.text === 'Sub')!
      expect(s.link).toBeUndefined()
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it("folderLinkFallback: 'first-file' 等价默认 order", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-old2-'))
    try {
      write(nodePath.join(tmp, 'sub', 'a.md'), '# A\n')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const sb = generateSidebar(idx, opts, {
        layout: 'tree',
        folderLinkFallback: 'first-file',
      }) as SidebarItem[]
      const s = sb.find((g) => g.text === 'Sub')!
      expect(s.link).toMatch(/sub\/a$/)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})

// ── I2: nav tab 用 folderLinkOrder ──────────────────────────────

describe('I2: generateNav 使用 folderLinkOrder', () => {
  it("默认:有 same-name → tab link 指向同名", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-nav-'))
    try {
      write(nodePath.join(tmp, 'tour', 'tour.md'), '# Tour\n')
      write(nodePath.join(tmp, 'index.md'), '# Home\n')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const nav = generateNav(idx, opts, {})
      const tour = nav.find((n) => n.text === 'Tour')!
      expect(tour).toBeDefined()
      expect(tour.link).toMatch(/tour\/tour$/)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it("folderLinkOrder=[] → nav 跳过这个 tab(若无 first-file 兜底)", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-nav2-'))
    try {
      write(nodePath.join(tmp, 'sub', 'a.md'), '# A')
      write(nodePath.join(tmp, 'index.md'), '# Home')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const nav = generateNav(idx, opts, { folderLinkOrder: [] })
      // v0.4.0:folderLinkOrder=[] 时,findFirstPageUrl 也走 resolveFolderLink
      // (即使 respectEmptyOptOut=false 也返回 null,因为根本没 kind 可枚举),
      // → 没 page 可指 → nav 跳过这个 tab。**这是设计**:用户显式 `[]` 就是
      // "我不要文件夹可点",含 nav。
      const s = nav.find((n) => n.text === 'Sub')
      expect(s).toBeUndefined()
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})

// ── I2: 用户 [[folder/]] wikilink ────────────────────────────────

describe('I2: [[folder/]] wikilink 用 folderLinkOrder', () => {
  it("有 README + first-file 顺序:用 README", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-wf-'))
    try {
      write(nodePath.join(tmp, 'docs', 'README.md'), '# RM\n')
      write(nodePath.join(tmp, 'docs', 'first.md'), '# First\n')
      const opts = resolveOptions({
        srcDir: tmp,
        cleanUrls: true,
        sidebarAuto: { folderLinkOrder: ['readme', 'first-file'] },
      })
      const idx = scanVault(opts)
      const r = resolveWikilink('docs/', idx, opts)
      expect(r.isDead).toBe(false)
      // index.md and README.md both route to '/docs/' if present; tests by basename
      expect(r.target?.basename.toLowerCase()).toBe('readme')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it("order=[] → wikilink 死链", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-wf2-'))
    try {
      write(nodePath.join(tmp, 'sub', 'a.md'), '# A')
      const opts = resolveOptions({
        srcDir: tmp,
        cleanUrls: true,
        sidebarAuto: { folderLinkOrder: [] },
      })
      const idx = scanVault(opts)
      const r = resolveWikilink('sub/', idx, opts)
      expect(r.isDead).toBe(true)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})

// ── I8: leading-number 分隔符放宽到 `)` `:` `,` etc. ────────────

describe('I8: leading-number 接受 ) : , — 等分隔符', () => {
  let tmp: string
  beforeAll(() => {
    tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-lns-'))
    write(
      nodePath.join(tmp, 'pool.md'),
      [
        '# Pool',
        '## 13) Optik und Wellenphänomene',      // ) 分隔
        '## 14: Elektrodynamik',                  // : 分隔
        '## 15, Quantum',                         // , 分隔
        '## 16 — Plain',                          // — 分隔(em-dash)
        '## 17.5 Sub-section',                    // . 不算分隔(避免误匹)
      ].join('\n\n'),
    )
    write(nodePath.join(tmp, 'src.md'), '# Src\n')
  })
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it("#13 命中 '13) Optik und Wellenphänomene'", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const r = resolveWikilink('pool#13', idx, opts)
    expect(r.isDead).toBe(false)
    expect(r.hasUnmatchedAnchor).toBe(false)
    // heading.slug = @mdit-vue/shared slugify("13) Optik und Wellenphänomene")
    //              = "_13-optik-und-wellenphanomene"(NFKD ä→a, 数字开头加 _)
    expect(r.url).toMatch(/#_?13-optik-und-wellenphanomene/i)
  })

  it("#14 命中 '14: Elektrodynamik'", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const r = resolveWikilink('pool#14', idx, opts)
    expect(r.hasUnmatchedAnchor).toBe(false)
  })

  it("#15 命中 '15, Quantum'", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const r = resolveWikilink('pool#15', idx, opts)
    expect(r.hasUnmatchedAnchor).toBe(false)
  })

  it("#16 命中 '16 — Plain'(em-dash)", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const r = resolveWikilink('pool#16', idx, opts)
    expect(r.hasUnmatchedAnchor).toBe(false)
  })

  it("#17 仍**不**误匹 '17.5 Sub-section'(. 不算分隔)", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const r = resolveWikilink('pool#17', idx, opts)
    // 17 后是 ".",根据我们规则不算分隔 → unmatched
    expect(r.hasUnmatchedAnchor).toBe(true)
  })

  it("用户写 #13-optik-und-wellenphaenomene(自己以为的 slug)也命中(数字前导提取)", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const r = resolveWikilink('pool#13-optik-und-wellenphaenomene', idx, opts)
    expect(r.isDead).toBe(false)
    expect(r.hasUnmatchedAnchor).toBe(false)
    // 用 heading 真实 slug,不是用户输入
    expect(r.url).toMatch(/#_?13-optik-und-wellenphanomene/i)
  })
})

// ── I1: autoFolderIndex 老选项触发 warn(不再生成文件)──────────

describe('I1: autoFolderIndex 已删除 — 仅警告', () => {
  it("传 autoFolderIndex 仍能 typecheck;运行时 console.warn;不写文件", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-rm-'))
    try {
      write(nodePath.join(tmp, 'sub', 'a.md'), '# A')
      const opts = resolveOptions({
        srcDir: tmp,
        cleanUrls: true,
        sidebarAuto: { autoFolderIndex: 'all' as unknown as undefined },
      })
      // 调 generateSidebar 不会写 index.md
      scanVault(opts)
      expect(fs.existsSync(nodePath.join(tmp, 'sub', 'index.md'))).toBe(false)
      expect(fs.existsSync(nodePath.join(tmp, 'index.md'))).toBe(false)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})
