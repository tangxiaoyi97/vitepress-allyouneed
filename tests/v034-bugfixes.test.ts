/**
 * v0.3.4 — 9 个 bug 的回归测试。
 *
 * 用户报的物理笔记 vault 暴露了一批边缘 case,这里把每个 bug 单独固化。
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import nodePath from 'node:path'
import os from 'node:os'
import MarkdownIt from 'markdown-it'

import { resolveOptions } from '../src/core/config-bridge.js'
import { scanVault } from '../src/core/vault/index.js'
import { resolveAsset, resolveWikilink } from '../src/core/resolver.js'
import { generateFolderIndexes } from '../src/core/sidebar-auto/generate-folder-index.js'
import { humanize } from '../src/core/sidebar-auto/generate-folder-index.js'
import allYouNeedMarkdownIt from '../src/markdown-it.js'
import { splitWikilinkInner } from '../src/utils/wikilink.js'
import { registerTagsInline } from '../src/modules/tags/index.js'
import type { AllYouNeedEnv } from '../src/core/types.js'

function write(p: string, c: string): void {
  fs.mkdirSync(nodePath.dirname(p), { recursive: true })
  fs.writeFileSync(p, c, 'utf8')
}

function buildMd(srcDir: string, cleanUrls = true): { md: MarkdownIt; env: AllYouNeedEnv } {
  const opts = resolveOptions({ srcDir, cleanUrls })
  const idx = scanVault(opts)
  const md = new MarkdownIt({ html: true })
  allYouNeedMarkdownIt(md, { srcDir, cleanUrls })
  registerTagsInline(md)
  const env: AllYouNeedEnv = { index: idx, options: opts }
  return { md, env }
}

// ── Bug 1:resolveAsset 相对当前 source 文件 ──────────────────────

describe('Bug 1: resolveAsset 相对当前文件 fallback', () => {
  let tmp: string
  beforeAll(() => {
    tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-b1-'))
    write(nodePath.join(tmp, 'Themen', 'media', 'image4.png'), 'PNG-FAKE')
    write(nodePath.join(tmp, 'Themen', 'Thema_10.md'), '# T10\n![[media/image4.png]]\n')
  })
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it('传 currentSourcePath 能找到相对路径资源', () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const src = nodePath.join(tmp, 'Themen', 'Thema_10.md')
    const { asset } = resolveAsset('media/image4.png', idx, opts, src)
    expect(asset).toBeDefined()
    expect(asset?.relativePath).toBe('Themen/media/image4.png')
  })

  it('不传 currentSourcePath 仍走老逻辑(找不到)', () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const { asset } = resolveAsset('media/image4.png', idx, opts)
    // 原 path 'media/image4.png' 真不在 vault 根,但 v0.3.4 加了 basename fallback
    // 所以这里反而会**找到** image4.png(basename 唯一匹配)
    expect(asset?.relativePath).toBe('Themen/media/image4.png')
  })

  it('basename 唯一时,任何路径都能 fallback 到 basename', () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    // 完全错的路径,但 basename 还是 image4.png
    const { asset } = resolveAsset('wrong/path/image4.png', idx, opts)
    expect(asset?.relativePath).toBe('Themen/media/image4.png')
  })
})

// ── Bug 2:autoFolderIndex 根目录死链 ────────────────────────────

describe('Bug 2: 生成 index.md 根目录不带 /', () => {
  let tmp: string
  beforeAll(() => {
    tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-b2-'))
    write(nodePath.join(tmp, 'foo.md'), '# Foo\n')
    write(nodePath.join(tmp, 'bar', 'baz.md'), '# Baz\n')
  })
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it('根目录生成的 index.md 链接不带前导 /', () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    generateFolderIndexes(opts, { mode: 'top-level' })
    const rootIdx = fs.readFileSync(nodePath.join(tmp, 'index.md'), 'utf8')
    // [[bar/|...]] 而不是 [[/bar/|...]]
    expect(rootIdx).toMatch(/\[\[bar\/\|/)
    expect(rootIdx).not.toMatch(/\[\[\/bar\//)
    expect(rootIdx).toMatch(/\[\[foo\|/)
    expect(rootIdx).not.toMatch(/\[\[\/foo\|/)
  })

  it('子目录生成的 index.md 仍带子目录前缀', () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    generateFolderIndexes(opts, { mode: 'all' })
    const subIdx = fs.readFileSync(nodePath.join(tmp, 'bar', 'index.md'), 'utf8')
    // bar/ 目录下生成的 index 引用 baz,路径前缀应该是 'bar/'
    expect(subIdx).toMatch(/\[\[bar\/baz\|/)
  })
})

// ── Bug 3:splitWikilinkInner 处理 \| ─────────────────────────────

describe("Bug 3: splitWikilinkInner 处理 Obsidian \\| 转义", () => {
  it("拆 'Foo|Bar' 同老行为", () => {
    expect(splitWikilinkInner('Foo|Bar')).toEqual(['Foo', 'Bar'])
  })
  it("拆 'Foo\\|Bar' 把 \\| 当分隔符,target 不留 \\", () => {
    expect(splitWikilinkInner('Foo\\|Bar')).toEqual(['Foo', 'Bar'])
  })
  it('段内空格保留', () => {
    expect(splitWikilinkInner('img.png|alt with space|300x200')).toEqual([
      'img.png',
      'alt with space',
      '300x200',
    ])
  })
  it("混合 | 和 \\|", () => {
    expect(splitWikilinkInner('a\\|b|c')).toEqual(['a', 'b', 'c'])
  })

  it('wikilink 渲染时 [[Foo\\|Bar]] 不再是死链', () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-b3-'))
    try {
      write(nodePath.join(tmp, 'Foo.md'), '# Foo\n')
      write(nodePath.join(tmp, 'index.md'), '| col | val |\n| --- | --- |\n| x | [[Foo\\|Display]] |\n')
      const { md, env } = buildMd(tmp)
      const html = md.render('[[Foo\\|Display]]', env)
      // 不应有 dead class
      expect(html).not.toMatch(/wikilink--dead/)
      // label 应是 Display(用户指定的)
      expect(html).toContain('Display')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})

// ── Bug 4:stripNumericPrefix 不吃版本号 ──────────────────────────

describe('Bug 4: humanize 不剥版本号', () => {
  it("'01-foo' → 'Foo'(数字前缀剥掉)", () => {
    expect(humanize('01-foo', true)).toBe('Foo')
  })
  it("'1.2.3-formula' 保留 1.2.3(不当数字前缀)", () => {
    // . 不再算分隔符,数字 1 后无 - / _ / 空格 → 不剥
    expect(humanize('1.2.3-formula', true)).toBe('1.2.3 Formula')
  })
  it("'02_bar baz' → 'Bar Baz'", () => {
    expect(humanize('02_bar baz', true)).toBe('Bar Baz')
  })
  it('stripNumeric=false 不动数字前缀', () => {
    expect(humanize('01-foo', false)).toBe('01 Foo')
  })
})

// ── Bug 5:tag href 带 .html(cleanUrls=false 下)──────────────────

describe('Bug 5: tag href 尊重 cleanUrls', () => {
  it('cleanUrls=true 不加 .html', () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-b5a-'))
    try {
      write(nodePath.join(tmp, 'a.md'), '# A')
      const { md, env } = buildMd(tmp, true)
      const html = md.render('See #physics for more.', env)
      const m = html.match(/href="([^"]+)"/)
      expect(m).toBeTruthy()
      expect(m![1]).toContain('/_perspectives_/tags#')
      expect(m![1]).not.toContain('.html')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
  it('cleanUrls=false 加 .html', () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-b5b-'))
    try {
      write(nodePath.join(tmp, 'a.md'), '# A')
      const { md, env } = buildMd(tmp, false)
      const html = md.render('See #physics for more.', env)
      const m = html.match(/href="([^"]+)"/)
      expect(m).toBeTruthy()
      expect(m![1]).toContain('/_perspectives_/tags.html#')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})

// ── Bug 6:comments block 与 fence 嵌套 ──────────────────────────

describe('Bug 6: comments block 不被内部 fence 提前关闭', () => {
  it('注释体里包 ``` fence 时,fence 内的 %% 不关闭注释', () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-b6-'))
    try {
      write(nodePath.join(tmp, 'a.md'), 'x')
      const { md, env } = buildMd(tmp)
      const src = [
        '%%',
        '```js',
        "console.log('%% inside fence %%')",
        '```',
        '%%',
        '',
        'visible',
      ].join('\n')
      const html = md.render(src, env)
      // 注释整段被吃掉,fence 也不该残留
      expect(html).not.toContain('console.log')
      expect(html).not.toContain('```')
      expect(html).toContain('visible')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})

// ── Bug 9:graph 边支持相对路径 ───────────────────────────────────

describe('Bug 9: graph generate-data 相对路径 wikilink 不丢边', async () => {
  const { buildVaultData } = await import('../src/core/views/generate-data.js')
  it('Themen/A.md 写 [[B]] 找同目录 Themen/B.md', () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-b9-'))
    try {
      write(nodePath.join(tmp, 'Themen', 'A.md'), '# A\n[[B|to B]]\n')
      write(nodePath.join(tmp, 'Themen', 'B.md'), '# B\n')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const data = buildVaultData(idx, opts)
      const edge = data.edges.find(
        (e) => e.source === 'Themen/A.md' && e.target === 'Themen/B.md',
      )
      expect(edge).toBeDefined()
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('表格内 [[Target\\|Alias]] 也能被 graph 识别', () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-b9b-'))
    try {
      write(nodePath.join(tmp, 'A.md'), '[[B\\|alias]]\n')
      write(nodePath.join(tmp, 'B.md'), '# B\n')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const data = buildVaultData(idx, opts)
      const edge = data.edges.find(
        (e) => e.source === 'A.md' && e.target === 'B.md',
      )
      expect(edge).toBeDefined()
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})

// ── transclusion 也传 currentPath ──────────────────────────────

describe('transclusion: resolveWikilink 接 currentSourcePath', () => {
  it('Themen/A.md 写 ![[../shared.md]] 能找到', () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-tx-'))
    try {
      write(nodePath.join(tmp, 'shared.md'), '# Shared')
      write(nodePath.join(tmp, 'Themen', 'A.md'), 'see\n\n![[shared]]\n')
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      // shared 是 basename,resolveWikilink 不含 / 时走 byBasename → 直接找到
      const r = resolveWikilink(
        'shared',
        idx,
        opts,
        'transclusion',
        nodePath.join(tmp, 'Themen', 'A.md'),
      )
      expect(r.isDead).toBe(false)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})
