/**
 * v0.3.9 — anchorMatch 模式、inlineTagPattern、comments preserve、_sidebar.md 占位符。
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import nodePath from 'node:path'
import os from 'node:os'
import MarkdownIt from 'markdown-it'

import { resolveOptions } from '../src/core/config-bridge.js'
import { scanVault } from '../src/core/vault/index.js'
import { resolveWikilink } from '../src/core/resolver.js'
import { parseSidebarOverride } from '../src/core/sidebar-auto/parse-sidebar-md.js'
import { generateSidebar } from '../src/core/sidebar-auto/index.js'
import allYouNeedMarkdownIt from '../src/markdown-it.js'
import { registerTagsInline } from '../src/modules/tags/index.js'
import type { AllYouNeedEnv } from '../src/core/types.js'
import type { SidebarItem } from '../src/core/sidebar-auto/index.js'

function write(p: string, c: string): void {
  fs.mkdirSync(nodePath.dirname(p), { recursive: true })
  fs.writeFileSync(p, c, 'utf8')
}

// ── F1: anchorMatch 三模式 ─────────────────────────────────────

describe('F1: anchorMatch 三模式', () => {
  let tmp: string
  beforeAll(() => {
    tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-am-'))
    write(
      nodePath.join(tmp, 'T07.md'),
      ['# 7', '## 7.1 Allgemeines', '## 7.2 Antike — Vorsokratiker', '## 7.2 Andere'].join('\n\n'),
    )
    write(
      nodePath.join(tmp, 'T11.md'),
      ['# 11', '## 11.2 Die drei Kepler\'schen Gesetze', '### 1. Kepler\'sches Gesetz'].join('\n\n'),
    )
    write(nodePath.join(tmp, 'index.md'), '# Home')
  })
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it("default 'leading-number':#7.2 命中第一个 '7.2 Antike — Vorsokratiker'", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const r = resolveWikilink('T07#7.2', idx, opts)
    expect(r.isDead).toBe(false)
    expect(r.hasUnmatchedAnchor).toBe(false)
    expect(r.url).toMatch(/#.*antike/i)
  })

  it("'leading-number' + 全文 anchor:精确匹配仍优先", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const r = resolveWikilink('T07#7.2 Andere', idx, opts)
    expect(r.isDead).toBe(false)
    expect(r.url).toMatch(/#.*andere/i)
  })

  it("'leading-number' fail:#7.99(数字但无 heading)→ unmatched", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const r = resolveWikilink('T07#7.99', idx, opts)
    expect(r.hasUnmatchedAnchor).toBe(true)
  })

  it("'exact' 模式:#7.2 严格找不到(text 不等)→ unmatched", () => {
    const opts = resolveOptions({
      srcDir: tmp,
      cleanUrls: true,
      wikilinks: { anchorMatch: 'exact' },
    })
    const idx = scanVault(opts)
    const r = resolveWikilink('T07#7.2', idx, opts)
    expect(r.hasUnmatchedAnchor).toBe(true)
  })

  it("'fuzzy' 模式:#11.2 Kepler 命中 '11.2 Die drei Kepler...'", () => {
    const opts = resolveOptions({
      srcDir: tmp,
      cleanUrls: true,
      wikilinks: { anchorMatch: 'fuzzy' },
    })
    const idx = scanVault(opts)
    const r = resolveWikilink('T11#11.2 Kepler', idx, opts)
    expect(r.isDead).toBe(false)
    expect(r.hasUnmatchedAnchor).toBe(false)
    expect(r.url).toMatch(/#.*kepler/i)
  })

  it("'leading-number':#11.2 Kepler 也命中(数字前缀匹配,关键词忽略)", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const r = resolveWikilink('T11#11.2 Kepler', idx, opts)
    expect(r.isDead).toBe(false)
    expect(r.hasUnmatchedAnchor).toBe(false)
  })
})

// ── F2: inlineTagPattern ───────────────────────────────────────

describe('F2: views.inlineTagPattern 可覆盖', () => {
  it("默认 pattern 识别 #tag", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-tag-'))
    try {
      write(nodePath.join(tmp, 'a.md'), '')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const md = new MarkdownIt({ html: true })
      allYouNeedMarkdownIt(md, { srcDir: tmp, cleanUrls: true })
      registerTagsInline(md)
      const env: AllYouNeedEnv = { index: idx, options: opts }
      const html = md.render('See #physics here', env)
      expect(html).toMatch(/class="ayn-tag"/)
      expect(html).toContain('#physics')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it("自定义 pattern 只匹配 ASCII", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-tag2-'))
    try {
      write(nodePath.join(tmp, 'a.md'), '')
      const opts = resolveOptions({
        srcDir: tmp,
        cleanUrls: true,
        views: { inlineTagPattern: /^#([A-Za-z][A-Za-z0-9_-]*)/ },
      })
      const idx = scanVault(opts)
      const md = new MarkdownIt({ html: true })
      allYouNeedMarkdownIt(md, opts as never)
      registerTagsInline(md)
      const env: AllYouNeedEnv = { index: idx, options: opts }
      // 中文 tag 不再匹配
      const html = md.render('See #中文 not match', env)
      expect(html).not.toMatch(/class="ayn-tag"/)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})

// ── F3: comments preserveAsHtmlComment ─────────────────────────

describe('F3: comments preserveAsHtmlComment', () => {
  it("默认开启:inline %%comment%% → <!--comment-->", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-cm-'))
    try {
      write(nodePath.join(tmp, 'a.md'), '')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const md = new MarkdownIt({ html: true })
      allYouNeedMarkdownIt(md, { srcDir: tmp, cleanUrls: true })
      const env: AllYouNeedEnv = { index: idx, options: opts }
      const html = md.render('Before %%secret%% after', env)
      expect(html).toContain('<!--secret-->')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it("preserveAsHtmlComment: false → 不保留", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-cm2-'))
    try {
      write(nodePath.join(tmp, 'a.md'), '')
      const opts = resolveOptions({
        srcDir: tmp,
        cleanUrls: true,
        comments: { preserveAsHtmlComment: false },
      })
      const idx = scanVault(opts)
      const md = new MarkdownIt({ html: true })
      allYouNeedMarkdownIt(md, opts as never)
      const env: AllYouNeedEnv = { index: idx, options: opts }
      const html = md.render('Before %%secret%% after', env)
      expect(html).not.toContain('secret')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it("HTML comment 里 -- 被 escape 避免提前关闭", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-cm3-'))
    try {
      write(nodePath.join(tmp, 'a.md'), '')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const md = new MarkdownIt({ html: true })
      allYouNeedMarkdownIt(md, { srcDir: tmp, cleanUrls: true })
      const env: AllYouNeedEnv = { index: idx, options: opts }
      const html = md.render('Before %%has -- inside%% after', env)
      // -- 应被换成 - -
      expect(html).toContain('<!--has - - inside-->')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})

// ── F5: _sidebar.md {folder} 占位符 ──────────────────────────

describe('F5: _sidebar.md {folder} 占位符', () => {
  let tmp: string
  beforeAll(() => {
    tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-side-'))
    // 文件夹 1:Themen/Thema_08
    write(nodePath.join(tmp, 'Themen', 'Thema_08', 'a.md'), '# A')
    write(nodePath.join(tmp, 'Themen', 'Thema_08', 'b.md'), '# B')
    // 文件夹 2:Themen/Thema_11
    write(nodePath.join(tmp, 'Themen', 'Thema_11', 'c.md'), '# C')
    write(nodePath.join(tmp, 'Themen', 'Thema_11', 'd.md'), '# D')
    // Thema_11 还有子文件夹
    write(nodePath.join(tmp, 'Themen', 'Thema_11', 'sub', 'e.md'), '# E')
    // 用 _sidebar.md 内嵌占位符
    write(
      nodePath.join(tmp, '_sidebar.md'),
      [
        '- Mechanics {Themen/Thema_08, Themen/Thema_11}',
        '- Quantum {Themen/Thema_08}',
        '  - Manual extra item',
      ].join('\n'),
    )
  })
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it("展开两个文件夹的直接文件 + 子目录 nested group", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const sidebarEntry = idx.files.get(nodePath.join(tmp, '_sidebar.md'))!
    const sb = parseSidebarOverride(sidebarEntry, idx, opts)!
    expect(sb).toBeDefined()
    const mech = sb.find((s) => s.text === 'Mechanics')!
    expect(mech).toBeDefined()
    // mech.items 应有 a, b(来自 Thema_08), c, d(来自 Thema_11), sub group(来自 Thema_11)
    const labels = mech.items!.map((it) => it.text)
    expect(labels).toContain('A')
    expect(labels).toContain('B')
    expect(labels).toContain('C')
    expect(labels).toContain('D')
    // 子目录 sub 作为 nested group
    const subGroup = mech.items!.find((it) => it.text === 'Sub')
    expect(subGroup).toBeDefined()
    expect(subGroup!.items!.some((it) => it.text === 'E')).toBe(true)
  })

  it("手动 sub-items 附加在展开内容后", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const sidebarEntry = idx.files.get(nodePath.join(tmp, '_sidebar.md'))!
    const sb = parseSidebarOverride(sidebarEntry, idx, opts)!
    const q = sb.find((s) => s.text === 'Quantum')!
    // 展开 Thema_08 → A, B;然后追加 Manual extra item
    const labels = q.items!.map((it) => it.text)
    expect(labels).toEqual(['A', 'B', 'Manual extra item'])
  })

  it("中文逗号 / 顿号也作分隔符", () => {
    const tmp2 = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-side2-'))
    try {
      write(nodePath.join(tmp2, 'fa', 'x.md'), '# X')
      write(nodePath.join(tmp2, 'fb', 'y.md'), '# Y')
      write(
        nodePath.join(tmp2, '_sidebar.md'),
        '- Group {fa，fb}',
      )
      const opts = resolveOptions({ srcDir: tmp2, cleanUrls: true })
      const idx = scanVault(opts)
      const entry = idx.files.get(nodePath.join(tmp2, '_sidebar.md'))!
      const sb = parseSidebarOverride(entry, idx, opts)!
      const g = sb[0] as SidebarItem
      const labels = g.items!.map((it) => it.text)
      expect(labels).toContain('X')
      expect(labels).toContain('Y')
    } finally {
      fs.rmSync(tmp2, { recursive: true, force: true })
    }
  })
})

// ── G2: stripNumericPrefixPattern 可配 ─────────────────────────

describe('G2: stripNumericPrefixPattern', () => {
  it("默认 pattern 处理 01-foo 不处理 1) foo", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-strip-'))
    try {
      write(nodePath.join(tmp, '01-mechanics', 'a.md'), '# A')
      write(nodePath.join(tmp, '1) old-format', 'b.md'), '# B')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      // generateSidebar imported at top
      const sb = generateSidebar(idx, opts, { layout: 'tree' }) as SidebarItem[]
      const mech = sb.find((s) => s.text === 'Mechanics')
      expect(mech).toBeDefined() // 01- 剥掉
      // '1) old-format' 没被剥(默认 pattern 不含 `)` )
      const other = sb.find((s) => s.text && /^1\)/.test(s.text))
      expect(other).toBeDefined()
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it("自定义 pattern 处理 1) foo", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-strip2-'))
    try {
      write(nodePath.join(tmp, '1) Mechanics', 'a.md'), '# A')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      // generateSidebar imported at top
      const sb = generateSidebar(idx, opts, {
        layout: 'tree',
        stripNumericPrefixPattern: /^\d+[\)\-_\s]+/,
      }) as SidebarItem[]
      const mech = sb.find((s) => s.text === 'Mechanics')
      expect(mech).toBeDefined() // 自定义 pattern 剥掉了 '1) '
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})

// ── G3: leading-number 歧义汇总 ───────────────────────────────

describe('G3: scanWikilinks ambiguous anchor 汇总', async () => {
  const { scanWikilinks } = await import('../src/core/scan-wikilinks.js')
  it("两个 #7.2 heading,scan 报 ambiguous", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-amb-'))
    try {
      write(
        nodePath.join(tmp, 'T07.md'),
        ['# 7', '## 7.2 Antike', '## 7.2 Andere'].join('\n\n'),
      )
      write(nodePath.join(tmp, 'src.md'), '[[T07#7.2]]')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const report = scanWikilinks(idx, opts)
      expect(report.ambiguous.length).toBe(1)
      const a = report.ambiguous[0]!
      expect(a.headingPart).toBe('7.2')
      expect(a.chosen).toBe('7.2 Antike')
      expect(a.others).toEqual(['7.2 Andere'])
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it("exact 模式不报 ambiguous(尊重用户严格意图)", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-amb2-'))
    try {
      write(
        nodePath.join(tmp, 'T07.md'),
        ['# 7', '## 7.2 A', '## 7.2 B'].join('\n\n'),
      )
      write(nodePath.join(tmp, 'src.md'), '[[T07#7.2]]')
      const opts = resolveOptions({
        srcDir: tmp,
        cleanUrls: true,
        wikilinks: { anchorMatch: 'exact' },
      })
      const idx = scanVault(opts)
      const report = scanWikilinks(idx, opts)
      expect(report.ambiguous.length).toBe(0)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})

// ── G4: _sidebar.md 相对路径 ──────────────────────────────────

describe('G4: _sidebar.md 路径相对当前 _sidebar.md', () => {
  it("无 / 前缀 = 相对 _sidebar.md 所在文件夹", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-rel-'))
    try {
      write(nodePath.join(tmp, 'Themen', 'sub1', 'a.md'), '# A')
      write(nodePath.join(tmp, 'Themen', 'sub2', 'b.md'), '# B')
      // _sidebar.md 在 Themen/ 里,占位符 'sub1' 应该是 Themen/sub1
      write(
        nodePath.join(tmp, 'Themen', '_sidebar.md'),
        '- Combined {sub1, sub2}',
      )
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const entry = idx.files.get(nodePath.join(tmp, 'Themen', '_sidebar.md'))!
      const sb = parseSidebarOverride(entry, idx, opts)!
      const g = sb[0]!
      const labels = g.items!.map((it) => it.text)
      expect(labels).toContain('A')
      expect(labels).toContain('B')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it("有 / 前缀 = srcDir 绝对", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-abs-'))
    try {
      write(nodePath.join(tmp, 'other', 'x.md'), '# X')
      write(nodePath.join(tmp, 'Themen', '_sidebar.md'), '- Foo {/other}')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const entry = idx.files.get(nodePath.join(tmp, 'Themen', '_sidebar.md'))!
      const sb = parseSidebarOverride(entry, idx, opts)!
      const g = sb[0]!
      const labels = g.items!.map((it) => it.text)
      expect(labels).toContain('X')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})

// ── G5: _sidebar.md 展开排序 + sidebarHidden ──────────────────

describe('G5: _sidebar 展开 sortBy + sidebarHidden', () => {
  it("尊重 frontmatter order(sortBy=order-then-title 默认)", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-sort-'))
    try {
      write(nodePath.join(tmp, 'sub', 'b.md'), '---\norder: 1\ntitle: B\n---')
      write(nodePath.join(tmp, 'sub', 'a.md'), '---\norder: 2\ntitle: A\n---')
      write(nodePath.join(tmp, '_sidebar.md'), '- Group {sub}')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const entry = idx.files.get(nodePath.join(tmp, '_sidebar.md'))!
      const sb = parseSidebarOverride(entry, idx, opts)!
      const g = sb[0]!
      // B 有 order:1,在 A 前(即使 A 字母靠前)
      expect(g.items!.map((it) => it.text)).toEqual(['B', 'A'])
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it("过滤 sidebarHidden:true 的文件", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-hid-'))
    try {
      write(nodePath.join(tmp, 'sub', 'visible.md'), '# Visible')
      write(nodePath.join(tmp, 'sub', 'hidden.md'), '---\nsidebarHidden: true\n---\n# Hidden')
      write(nodePath.join(tmp, '_sidebar.md'), '- Group {sub}')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const entry = idx.files.get(nodePath.join(tmp, '_sidebar.md'))!
      const sb = parseSidebarOverride(entry, idx, opts)!
      const g = sb[0]!
      const labels = g.items!.map((it) => it.text)
      expect(labels).toContain('Visible')
      expect(labels).not.toContain('Hidden')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})

// ── H1: stripNumericPrefixSeparators ─────────────────────────

describe('H1: stripNumericPrefixSeparators 友好分隔符', () => {
  it("默认 separators 等价 [-_\\s]", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-h1-'))
    try {
      write(nodePath.join(tmp, '01-mech', 'a.md'), '# A')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const sb = generateSidebar(idx, opts, { layout: 'tree' }) as SidebarItem[]
      expect(sb.find((s) => s.text === 'Mech')).toBeDefined()
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it("自定义 separators 包含 )", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-h1b-'))
    try {
      write(nodePath.join(tmp, '1) mech', 'a.md'), '# A')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const sb = generateSidebar(idx, opts, {
        layout: 'tree',
        stripNumericPrefixSeparators: ')\\-_\\s',
      }) as SidebarItem[]
      expect(sb.find((s) => s.text === 'Mech')).toBeDefined()
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it("Pattern 优先于 Separators(都设了用 Pattern)", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-h1c-'))
    try {
      write(nodePath.join(tmp, '01-foo', 'a.md'), '# A')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      // Pattern 设为永不匹配,Separators 设为默认。结果应是 Pattern 优先 = 不剥
      const sb = generateSidebar(idx, opts, {
        layout: 'tree',
        stripNumericPrefixPattern: /^NEVER_MATCH/,
        stripNumericPrefixSeparators: '-_\\s',
      }) as SidebarItem[]
      // 不剥前缀,group 标题保留 '01-foo' → humanize 后 '01 Foo'
      const g = sb.find((s) => s.text === '01 Foo')
      expect(g).toBeDefined()
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})

// ── H2: _sidebar.md frontmatter per-folder 规则 ───────────────

describe('H2: _sidebar.md frontmatter override', () => {
  it("frontmatter sidebarAuto.sortBy 覆盖全局", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-h2-'))
    try {
      // sub/ 里 b 的 order=1 应在 a 前(全局 order-then-title 默认)
      write(nodePath.join(tmp, 'sub', 'a.md'), '---\norder: 2\ntitle: A\n---')
      write(nodePath.join(tmp, 'sub', 'b.md'), '---\norder: 1\ntitle: B\n---')
      // _sidebar.md 在 frontmatter 覆盖 sortBy='title' → 应改成按 title 排
      write(
        nodePath.join(tmp, '_sidebar.md'),
        '---\nsidebarAuto:\n  sortBy: title\n---\n- Group {sub}',
      )
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const entry = idx.files.get(nodePath.join(tmp, '_sidebar.md'))!
      const sb = parseSidebarOverride(entry, idx, opts)!
      const g = sb[0]!
      // title 排序 = A 在前(忽略 order)
      expect(g.items!.map((it) => it.text)).toEqual(['A', 'B'])
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it("frontmatter sidebarAuto.foldersFirst 翻转顺序", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-h2b-'))
    try {
      write(nodePath.join(tmp, 'top', 'file.md'), '# File')
      write(nodePath.join(tmp, 'top', 'sub', 'nested.md'), '# N')
      write(
        nodePath.join(tmp, '_sidebar.md'),
        '---\nsidebarAuto:\n  foldersFirst: true\n---\n- Group {top}',
      )
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const entry = idx.files.get(nodePath.join(tmp, '_sidebar.md'))!
      const sb = parseSidebarOverride(entry, idx, opts)!
      const g = sb[0]!
      // foldersFirst=true:Sub group 在前,File 在后
      expect(g.items![0]!.text).toBe('Sub')
      expect(g.items![1]!.text).toBe('File')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})

// ── H4: 空 text + placeholder = inline 展开 ───────────────────

describe('H4: `- {.}` inline 展开(无包裹 group)', () => {
  it("空 text 的 placeholder 直接展开到父层级", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-h4-'))
    try {
      write(nodePath.join(tmp, 'sub', 'a.md'), '# A')
      write(nodePath.join(tmp, 'sub', 'b.md'), '# B')
      write(nodePath.join(tmp, '_sidebar.md'), '- {sub}')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const entry = idx.files.get(nodePath.join(tmp, '_sidebar.md'))!
      const sb = parseSidebarOverride(entry, idx, opts)!
      // 顶层直接是 A 和 B,没有 group 包裹
      const labels = sb.map((it) => it.text)
      expect(labels).toContain('A')
      expect(labels).toContain('B')
      // 不应有无 text 的 group
      expect(sb.every((it) => it.text && it.text.trim() !== '')).toBe(true)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it("`{.}` 引用当前 _sidebar.md 所在目录", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-h4b-'))
    try {
      write(nodePath.join(tmp, 'Themen', 'thema1.md'), '# Thema 1')
      write(nodePath.join(tmp, 'Themen', 'thema2.md'), '# Thema 2')
      write(nodePath.join(tmp, 'Themen', '_sidebar.md'), '- {.}')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const entry = idx.files.get(nodePath.join(tmp, 'Themen', '_sidebar.md'))!
      const sb = parseSidebarOverride(entry, idx, opts)!
      const labels = sb.map((it) => it.text)
      expect(labels).toContain('Thema 1')
      expect(labels).toContain('Thema 2')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})

// ── H3: materialize 生成 _sidebar.md ────────────────────────────

describe('H3: sidebarAuto.materialize', async () => {
  const { generateSidebarMaterializations, SIDEBAR_MATERIALIZE_SENTINEL } =
    await import('../src/core/sidebar-auto/index.js')

  it("mode='off' 不生成", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-mat-'))
    try {
      write(nodePath.join(tmp, 'sub', 'a.md'), '# A')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const r = generateSidebarMaterializations(opts, { mode: 'off' })
      expect(r.written.length).toBe(0)
      expect(fs.existsSync(nodePath.join(tmp, 'sub', '_sidebar.md'))).toBe(false)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it("mode='top-level' 给顶级目录生成,内含 sentinel + `- {.}`", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-mat2-'))
    try {
      write(nodePath.join(tmp, 'top', 'a.md'), '# A')
      write(nodePath.join(tmp, 'top', 'sub', 'b.md'), '# B') // 深层
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const r = generateSidebarMaterializations(opts, { mode: 'top-level' })
      // 根 + top 都生成,但 top/sub 不生成
      const writtenRels = r.written.map((p) => nodePath.relative(tmp, p))
      expect(writtenRels).toContain('_sidebar.md')
      expect(writtenRels).toContain(nodePath.join('top', '_sidebar.md'))
      expect(writtenRels).not.toContain(nodePath.join('top', 'sub', '_sidebar.md'))
      // 内容含 sentinel + placeholder
      const content = fs.readFileSync(
        nodePath.join(tmp, 'top', '_sidebar.md'),
        'utf8',
      )
      expect(content).toContain(SIDEBAR_MATERIALIZE_SENTINEL)
      expect(content).toContain('- {.}')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it("不覆盖用户已有的无 sentinel 的 _sidebar.md", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-mat3-'))
    try {
      write(nodePath.join(tmp, 'top', 'a.md'), '# A')
      write(nodePath.join(tmp, 'top', '_sidebar.md'), '- Custom manual')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const r = generateSidebarMaterializations(opts, { mode: 'top-level' })
      // top/_sidebar.md 应在 skipped
      expect(
        r.skipped.some((s) =>
          s.path.endsWith(nodePath.join('top', '_sidebar.md')),
        ),
      ).toBe(true)
      // 内容没变
      const content = fs.readFileSync(
        nodePath.join(tmp, 'top', '_sidebar.md'),
        'utf8',
      )
      expect(content).toBe('- Custom manual')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it("含 sentinel 的允许覆盖(模板升级场景)", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-mat4-'))
    try {
      write(nodePath.join(tmp, 'top', 'a.md'), '# A')
      // 先模拟"之前生成过"的 _sidebar.md
      write(
        nodePath.join(tmp, 'top', '_sidebar.md'),
        '---\n---\n' + SIDEBAR_MATERIALIZE_SENTINEL + '\n\n- Old content',
      )
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const r = generateSidebarMaterializations(opts, { mode: 'top-level' })
      expect(
        r.written.some((p) => p.endsWith(nodePath.join('top', '_sidebar.md'))),
      ).toBe(true)
      const content = fs.readFileSync(
        nodePath.join(tmp, 'top', '_sidebar.md'),
        'utf8',
      )
      // 新内容包含模板的 `- {.}`,旧的 'Old content' 没了
      expect(content).toContain('- {.}')
      expect(content).not.toContain('Old content')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it("materialize + 真实展开:文件夹有内容 → 用户改 _sidebar.md → 自动适配新文件", () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-mat5-'))
    try {
      write(nodePath.join(tmp, 'top', 'a.md'), '# A')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      generateSidebarMaterializations(opts, { mode: 'top-level' })
      // 现在 top/_sidebar.md 含 `- {.}`,scan + parseSidebarOverride 应展开为 A
      const idx = scanVault(opts)
      const entry = idx.files.get(nodePath.join(tmp, 'top', '_sidebar.md'))!
      const sb = parseSidebarOverride(entry, idx, opts)!
      // 顶层应有 A(inline 展开,无 group 包裹)
      expect(sb.some((it) => it.text === 'A')).toBe(true)
      // 添加新文件 b.md → re-scan → 应自动出现在 sidebar
      write(nodePath.join(tmp, 'top', 'b.md'), '# B')
      const idx2 = scanVault(opts)
      const entry2 = idx2.files.get(nodePath.join(tmp, 'top', '_sidebar.md'))!
      const sb2 = parseSidebarOverride(entry2, idx2, opts)!
      expect(sb2.some((it) => it.text === 'B')).toBe(true)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})
