/**
 * v0.5.2 — 三个 build-blocker / 死链 bug 的回归测试。
 *
 * Bug 1: `#tag` inline rule 在 silent 模式不推进 state.pos →
 *        markdown-it link 核心规则的 parseLinkLabel(skipToken)抛
 *        `inline rule didn't increment state.pos`,整个 vitepress build 崩。
 * Bug 2: 自引用锚点 `[[#heading]]`(无文件部分)被误判 dead,即使 slug 精确匹配。
 * Bug 3: 缺失的 image/media embed 回退成绝对 src `/basename` → Vite/Rollup
 *        当模块 import 解析不到,硬中断 build。改为占位 <span> + deadLink 策略。
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import nodePath from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import MarkdownIt from 'markdown-it'

import { resolveOptions } from '../src/core/config-bridge.js'
import { scanVault } from '../src/core/vault/index.js'
import { resolveWikilink } from '../src/core/resolver.js'
import { scanWikilinks } from '../src/core/scan-wikilinks.js'
import allYouNeed from '../src/markdown-it.js'
import { registerTagsInline } from '../src/modules/tags/rule.js'
import type {
  AllYouNeedEnv,
  ResolvedOptions,
  VaultIndex,
} from '../src/core/types.js'

const here = nodePath.dirname(fileURLToPath(import.meta.url))
const VAULT = nodePath.join(here, 'fixtures', 'vault')

function makeMd(
  options: ResolvedOptions,
  index: VaultIndex,
): { md: MarkdownIt; env: AllYouNeedEnv } {
  const md = new MarkdownIt({ html: true })
  md.use(allYouNeed, options)
  return {
    md,
    env: { index, options, referencedAssets: new Set() } as AllYouNeedEnv,
  }
}

// ── Bug 1:#tag in silent mode must advance state.pos ─────────────────
// 注:#tag inline rule 在 VitePress 集成层(vitepress.ts)才注册,base
// markdown-it 插件不含它。所以这里手动 registerTagsInline 才能真正复现
// 这个 build-blocker(否则规则根本没上,等于没测到)。
describe('v0.5.2 Bug1: #tag inline rule 在 link-label 的 silent 扫描下不崩', () => {
  let md: MarkdownIt
  let env: AllYouNeedEnv

  beforeAll(() => {
    const opts = resolveOptions({ srcDir: VAULT, cleanUrls: true })
    const idx = scanVault(opts)
    ;({ md, env } = makeMd(opts, idx))
    registerTagsInline(md)
  })

  // 这些输入在 0.5.1 都会让 markdown-it 抛
  // `inline rule didn't increment state.pos`(parseLinkLabel re-entry)。
  // 修复后必须正常渲染、不抛。
  it('markdown link label 内含 #tag:[see #foo](/x) 不抛', () => {
    expect(() => md.render('[see #foo](/x)\n', env)).not.toThrow()
  })

  it('裸 [#tag] 链接 label 扫描不抛', () => {
    expect(() => md.render('text [#alpha] more\n', env)).not.toThrow()
  })

  it('GFM 表格单元格里 #tag(报告的原始触发场景)不抛', () => {
    const tbl =
      '| A | B |\n' +
      '|---|---|\n' +
      '| x | see [link #beta](/y) |\n'
    expect(() => md.render(tbl, env)).not.toThrow()
  })

  it('嵌套 [ 上下文 + #tag:[[ ... [#gamma] ... ]] 不抛', () => {
    expect(() =>
      md.render('prefix [ outer [#gamma] inner ] suffix\n', env),
    ).not.toThrow()
  })

  it('正常(非 silent)#tag 仍渲染成 a.ayn-tag', () => {
    const html = md.render('a #physik tag\n', env)
    expect(html).toContain('class="ayn-tag"')
    expect(html).toContain('data-tag="physik"')
  })
})

// ── Bug 2:self-anchor [[#heading]] resolves to current file ──────────
describe('v0.5.2 Bug2: 自引用锚点 [[#heading]] 不再死链', () => {
  let tmp: string
  let opts: ResolvedOptions
  let idx: VaultIndex
  let selfPath: string

  beforeAll(() => {
    tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-self-'))
    selfPath = nodePath.join(tmp, 'Themen', 'Astro.md')
    write(
      selfPath,
      [
        '# Astro',
        '## a) Transitmethode',
        '## Biomarker',
        '## 1.7 Sterntypen und Planeten roter Zwerge',
        'Siehe [[#Biomarker]] und [[#a) Transitmethode]].',
      ].join('\n\n'),
    )
    write(nodePath.join(tmp, 'index.md'), '# Home')
    opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    idx = scanVault(opts)
  })
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

  // selfPath 必须用 scan 后 index 里的 key 形态(posix)。
  function selfKey(): string {
    for (const k of idx.files.keys()) {
      if (k.endsWith('Themen/Astro.md')) return k
    }
    throw new Error('self file not found in index')
  }

  it('[[#Biomarker]](精确 slug, 非数字)→ 命中当前文件锚点, 不 dead', () => {
    const r = resolveWikilink('#Biomarker', idx, opts, 'page', selfKey())
    expect(r.isDead).toBe(false)
    expect(r.hasUnmatchedAnchor).toBe(false)
    expect(r.url).toMatch(/#biomarker$/)
  })

  it('[[#a) Transitmethode]](精确 slug)→ 不 dead', () => {
    const r = resolveWikilink('#a) Transitmethode', idx, opts, 'page', selfKey())
    expect(r.isDead).toBe(false)
    expect(r.hasUnmatchedAnchor).toBe(false)
    expect(r.url).toMatch(/#a-transitmethode$/)
  })

  it('[[#1.7 …]](leading-number + 精确)→ 不 dead', () => {
    const r = resolveWikilink(
      '#1.7 Sterntypen und Planeten roter Zwerge',
      idx,
      opts,
      'page',
      selfKey(),
    )
    expect(r.isDead).toBe(false)
    expect(r.hasUnmatchedAnchor).toBe(false)
  })

  it('没有 currentSourcePath 时仍判 dead(无法确定自引用目标)', () => {
    const r = resolveWikilink('#Biomarker', idx, opts, 'page', undefined)
    expect(r.isDead).toBe(true)
  })

  it('自引用但锚点不存在 → 文件命中但标 unmatched-anchor(不整条 dead)', () => {
    const r = resolveWikilink('#GibtEsNicht', idx, opts, 'page', selfKey())
    expect(r.isDead).toBe(false)
    expect(r.hasUnmatchedAnchor).toBe(true)
  })

  // scanWikilinks(启动期死链汇总)此前也把自引用锚点当 dead 上报(报告:
  // “74 处页内跳转锚点全死” 的日志来源)。修复后这些不应再出现在 dead 列表。
  it('scanWikilinks 不再把自引用锚点 [[#…]] 报成死链', () => {
    const report = scanWikilinks(idx, opts)
    const selfDead = report.dead.filter(
      (d) => d.raw.startsWith('[[#') || d.target === '',
    )
    expect(selfDead).toEqual([])
  })
})

// ── Bug 3:missing embed never crashes (covered for image+media here) ─
describe('v0.5.2 Bug3: 缺失 embed 渲染占位而非崩 build', () => {
  let md: MarkdownIt
  let env: AllYouNeedEnv

  beforeAll(() => {
    const opts = resolveOptions({ srcDir: VAULT, cleanUrls: true })
    const idx = scanVault(opts)
    ;({ md, env } = makeMd(opts, idx))
  })

  it('缺失 image ![[no.png]] → 占位 span, 无 <img>, 无绝对 src', () => {
    const html = md.render('![[no.png]]\n', env)
    expect(html).toContain('ayn-embed--missing')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('src="/')
  })

  it('缺失 gif(报告原案)![[animations/foo.gif]] → 占位, 不崩', () => {
    const html = md.render('![[animations/foo.gif]]\n', env)
    expect(html).toContain('ayn-embed--missing')
    expect(html).not.toContain('src="/')
  })

  it('缺失 video/audio/pdf → 占位, 无播放器/iframe, 无绝对 src', () => {
    for (const ext of ['mp4', 'mp3', 'pdf']) {
      const html = md.render(`![[missing.${ext}]]\n`, env)
      expect(html).toContain('ayn-embed--missing')
      expect(html).not.toContain('src="/')
    }
  })

  it("deadLink='error' 时缺失 embed 推 warning(但不 throw)", () => {
    const opts = resolveOptions({ srcDir: VAULT, cleanUrls: true, deadLink: 'error' })
    const idx = scanVault(opts)
    const { md: md2, env: env2 } = makeMd(opts, idx)
    env2.currentPath = 'X.md'
    const before = idx.warnings.length
    const html = md2.render('![[missing.gif]]\n', env2)
    expect(html).toContain('ayn-embed--missing')
    expect(idx.warnings.length).toBeGreaterThan(before)
  })
})

function write(p: string, c: string): void {
  fs.mkdirSync(nodePath.dirname(p), { recursive: true })
  fs.writeFileSync(p, c, 'utf8')
}
