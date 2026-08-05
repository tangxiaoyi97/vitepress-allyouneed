/**
 * 端到端渲染测试 —— 把 markdown 跑过完整 markdown-it 管线,
 * 验证 [[]] / ![[]] 输出符合预期。
 */

import { describe, expect, it, beforeAll } from 'vitest'
import nodePath from 'node:path'
import { fileURLToPath } from 'node:url'
import MarkdownIt from 'markdown-it'
import { resolveOptions } from '../src/core/config-bridge.js'
import { scanVault } from '../src/core/vault/index.js'
import allYouNeed from '../src/markdown-it.js'
import type {
  AllYouNeedEnv,
  ResolvedOptions,
  VaultIndex,
} from '../src/core/types.js'

const here = nodePath.dirname(fileURLToPath(import.meta.url))
const VAULT = nodePath.join(here, 'fixtures', 'vault')

function makeMd(options: ResolvedOptions, index: VaultIndex): {
  md: MarkdownIt
  env: AllYouNeedEnv
} {
  const md = new MarkdownIt({ html: true })
  md.use(allYouNeed, options)
  const env: AllYouNeedEnv = {
    index,
    options,
    referencedAssets: new Set(),
  }
  return { md, env }
}

// HOTFIX 回归(0.5.1):wikilink 在 markdown link label / 嵌套方括号 / 表格单元格里
// 不能让 markdown-it 抛 "inline rule didn't increment state.pos"。
// 根因:wikilink inline rule 在 silent 模式(parseLinkLabel → skipToken 调用)下
// 必须推进 state.pos,而不是直接 return true。见 src/modules/wikilinks/rule.ts。
describe('Render — wikilink in link-label / nesting (no crash)', () => {
  let md: MarkdownIt
  let env: AllYouNeedEnv

  beforeAll(() => {
    const options = resolveOptions({ srcDir: VAULT, cleanUrls: true, onConflict: 'shortest' })
    const index = scanVault(options)
    const made = makeMd(options, index)
    md = made.md
    env = made.env
  })

  // 这些输入在修复前会抛 "inline rule didn't increment state.pos"
  const crashCases: Array<[string, string]> = [
    ['wikilink inside markdown link label', '[outer [[Note A]] text](http://example.com)'],
    ['wikilink inside nested brackets', 'see [ [[Note A]] ] here'],
    ['embed inside markdown link label', '[label ![[Note A]] x](http://example.com)'],
    ['anchor-only wikilink in label', '[x [[#Sec|Sec]] y](http://example.com)'],
    ['wikilink in GFM table cell', '| K | V |\n|:--|:--|\n| A | x [[Note A]] y |'],
    ['two wikilinks in table cell', '| K | V |\n|:--|:--|\n| A | [[Note A]] and [[Note B]] |'],
  ]
  for (const [name, src] of crashCases) {
    it(`不崩:${name}`, () => {
      expect(() => md.render(src, env)).not.toThrow()
    })
  }

  it('link label 里的 wikilink 仍然渲染成 <a class="wikilink">', () => {
    const html = md.render('[outer [[Note A]] text](http://example.com)', env)
    expect(html).toContain('class="wikilink"')
  })
})

describe('Render — wikilinks', () => {
  let md: MarkdownIt
  let env: AllYouNeedEnv

  beforeAll(() => {
    const options = resolveOptions({
      srcDir: VAULT,
      cleanUrls: true,
      onConflict: 'shortest',
    })
    const index = scanVault(options)
    const made = makeMd(options, index)
    md = made.md
    env = made.env
  })

  it('[[Note A]] → <a class="wikilink">', () => {
    const html = md.renderInline('[[Note A]]', env)
    expect(html).toContain('class="wikilink"')
    expect(html).toContain('href="/Note%20A"')
    expect(html).toContain('Note A</a>')
  })

  it('[[Note B|Alias to B]] 显示自定义 label', () => {
    const html = md.renderInline('[[Note B|Alias to B]]', env)
    expect(html).toContain('>Alias to B</a>')
  })

  it('[[Note A#一级标题]] 输出锚点', () => {
    const html = md.renderInline('[[Note A#一级标题]]', env)
    expect(html).toContain('#一级标题')
  })

  it('死链 [[Nope]] 加 wikilink--dead', () => {
    const html = md.renderInline('[[Nope]]', env)
    expect(html).toContain('wikilink--dead')
  })

  it('code span 内的 [[...]] 不解析', () => {
    const html = md.renderInline('`[[Note A]]`', env)
    expect(html).not.toContain('class="wikilink"')
    expect(html).toContain('[[Note A]]')
  })

  it('fenced code 内的 [[...]] 不解析', () => {
    const html = md.render('```\n[[Note A]]\n```\n', env)
    expect(html).not.toContain('class="wikilink"')
  })
})

describe('Render — image embeds', () => {
  let md: MarkdownIt
  let env: AllYouNeedEnv

  beforeAll(() => {
    const options = resolveOptions({ srcDir: VAULT, cleanUrls: true })
    const index = scanVault(options)
    const made = makeMd(options, index)
    md = made.md
    env = made.env
  })

  it('![[image.png]] → <img>', () => {
    const html = md.renderInline('![[image.png]]', env)
    expect(html).toContain('<img ')
    expect(html).toContain('src=')
  })

  it('![[image.png|alt text]] 设 alt', () => {
    const html = md.renderInline('![[image.png|some cat]]', env)
    expect(html).toContain('alt="some cat"')
  })

  it('![[image.png|300]] 仅宽度', () => {
    const html = md.renderInline('![[image.png|300]]', env)
    expect(html).toContain('width="300"')
    expect(html).not.toContain('height=')
  })

  it('![[image.png|x200]] 仅高度', () => {
    const html = md.renderInline('![[image.png|x200]]', env)
    expect(html).toContain('height="200"')
  })

  it('![[image.png|300x200]] 宽高', () => {
    const html = md.renderInline('![[image.png|300x200]]', env)
    expect(html).toContain('width="300"')
    expect(html).toContain('height="200"')
  })

  it('![[image.png|alt|300x200]] alt + 尺寸', () => {
    const html = md.renderInline('![[image.png|cat|300x200]]', env)
    expect(html).toContain('alt="cat"')
    expect(html).toContain('width="300"')
  })

  it('登记 referencedAssets', () => {
    md.renderInline('![[image.png]]', env)
    expect(env.referencedAssets!.size).toBeGreaterThan(0)
  })

  it('alt 始终存在(回归:防止 markdown-it 默认 image 渲染器 attrs[-1] 崩溃)', () => {
    // 即使 defaultAltText: false + 无用户 alt,输出也应是合法 HTML
    const html = md.renderInline('![[image.png]]', env)
    expect(html).toMatch(/<img\b[^>]*\balt="[^"]*"/)
  })

  it('普通 Markdown 外链图片支持 Obsidian 宽高语法', () => {
    const html = md.renderInline(
      '![diagram|320x180](https://example.com/diagram.png)',
      env,
    )
    expect(html).toContain('src="https://example.com/diagram.png"')
    expect(html).toContain('alt="diagram"')
    expect(html).toContain('width="320"')
    expect(html).toContain('height="180"')
  })

  it('普通 Markdown 外链图片的纯数字 alt 作为宽度而非替代文本', () => {
    const html = md.renderInline('![250](https://example.com/photo.png)', env)
    expect(html).toContain('alt=""')
    expect(html).toContain('width="250"')
  })

  it('普通 Markdown 图片的非尺寸 alt 保持不变', () => {
    const html = md.renderInline('![release|candidate](https://example.com/badge.png)', env)
    expect(html).toContain('alt="release|candidate"')
    expect(html).not.toContain('width=')
    expect(html).not.toContain('height=')
  })

  it('外链图片尺寸保留强调、实体、转义管道和 title 的 alt 语义', () => {
    const emphasized = md.renderInline('![*diagram*|100](https://example.com/a.png "A")', env)
    expect(emphasized).toContain('alt="diagram"')
    expect(emphasized).toContain('title="A"')
    expect(emphasized).toContain('width="100"')

    const entity = md.renderInline('![A &amp; B|100](https://example.com/b.png)', env)
    expect(entity).toContain('alt="A &amp; B"')
    expect(entity).toContain('width="100"')

    const escaped = md.renderInline(String.raw`![a\|b|100](https://example.com/c.png)`, env)
    expect(escaped).toContain('alt="a|b"')
    expect(escaped).toContain('width="100"')
  })

  it('转义管道和未记录的单边尺寸不会被误判', () => {
    const escapedOnly = md.renderInline(String.raw`![alt\|100](https://example.com/a.png)`, env)
    expect(escapedOnly).not.toContain('width=')
    expect(escapedOnly).toContain('alt=')

    for (const alt of ['x200', '100x']) {
      const html = md.renderInline(`![${alt}](https://example.com/a.png)`, env)
      expect(html).not.toContain('width=')
      expect(html).not.toContain('height=')
      expect(html).toContain(`alt="${alt}"`)
    }
  })

  it('外链图片尺寸支持引用式图片，关闭 embeds 时保持原始 Markdown 行为', () => {
    const reference = md.render('![reference|90x60][asset]\n\n[asset]: https://example.com/a.png "Asset"\n', env)
    expect(reference).toContain('alt="reference"')
    expect(reference).toContain('width="90"')
    expect(reference).toContain('height="60"')
    expect(reference).toContain('title="Asset"')

    const disabledOptions = resolveOptions({
      srcDir: VAULT,
      cleanUrls: true,
      modules: { embeds: false },
    })
    const disabled = makeMd(disabledOptions, scanVault(disabledOptions))
    const original = disabled.md.renderInline(
      '![diagram|100](https://example.com/a.png)',
      disabled.env,
    )
    expect(original).toContain('alt="diagram|100"')
    expect(original).not.toContain('width=')
  })

  // HOTFIX(0.5.2):缺失 image 不能再产出 <img src="/basename">。那个绝对 URL
  // 会被 Vite/Rollup 当模块 import,解析不到就硬崩整个 build
  // (`Rollup failed to resolve import "/foo.png"`)。改为渲染不触发 Vite 解析的
  // 占位 <span>,按 deadLink 策略告警,绝不 throw。
  it('未知 image basename → 占位 <span>(不产出会崩 build 的 <img src=/...>)', () => {
    const html = md.renderInline('![[never-exists.png]]', env)
    expect(html).toContain('ayn-embed--missing')
    expect(html).toContain('never-exists.png')
    // 关键:绝不能再有 <img>(尤其不能有指向绝对路径的 src)
    expect(html).not.toContain('<img')
    expect(html).not.toContain('src="/')
  })

  /**
   * 回归:asset 占位符 URL 必须保留 `/`(用 encodeURI 而不是 encodeURIComponent)。
   * 后续 Vite 的 resolveId 会把这串 URL 转成真实文件路径,但前提是 URL 形态稳定。
   */
  it('回归:asset 占位符 URL 保留 / 不编码', () => {
    const html = md.renderInline('![[image.png]]', env)
    expect(html).toContain('/__ayn_asset__/')
    expect(html).not.toContain('%2F')
    expect(html).toMatch(/src="\/__ayn_asset__\/assets\/image\.png/)
  })
})

describe('Render — transclusion', () => {
  let md: MarkdownIt
  let env: AllYouNeedEnv

  beforeAll(() => {
    const options = resolveOptions({ srcDir: VAULT, cleanUrls: true })
    const index = scanVault(options)
    const made = makeMd(options, index)
    md = made.md
    env = made.env
  })

  it('![[note-with-emoji]] 内联整篇', () => {
    const html = md.render('![[note-with-emoji]]', env)
    expect(html).toContain('class="transclusion"')
    expect(html).toContain('Body line 1')
  })

  it('![[Note A#一级标题]] 切片', () => {
    const html = md.render('![[Note A#一级标题]]', env)
    expect(html).toContain('Hello from Note A')
    // 切片应该止于"二级 标题 with spaces"
    expect(html).not.toContain('二级 标题')
  })

  it('![[cycle-a]] 循环引用降级提示', () => {
    const html = md.render('![[cycle-a]]', env)
    // 内层 cycle-b 又 embed cycle-a,会触发 cycle 提示
    expect(html).toContain('transclusion--cycle')
  })

  it('![[unknown-note]] 死链提示', () => {
    const html = md.render('![[unknown-note]]', env)
    expect(html).toContain('transclusion--dead')
  })

  it('未匹配 heading → unmatched-anchor 提示', () => {
    const html = md.render('![[Note A#不存在]]', env)
    expect(html).toContain('transclusion--unmatched-anchor')
  })

  // ── 回归:必须用 block-level html_block 包,不能被 <p> 包裹 ──
  it('整行 ![[note]] 块级:外层不被 <p> 包裹', () => {
    const html = md.render('![[note-with-emoji]]\n', env)
    // 不应该出现 <p><div class="transclusion">
    expect(html).not.toMatch(/<p[^>]*>\s*<div class="transclusion"/)
    // 应该直接是 <div class="transclusion">
    expect(html).toMatch(/^<div class="transclusion"/)
  })

  it('整行 ![[image.png]] 块级:外层不被 <p> 包裹', () => {
    const html = md.render('![[image.png]]\n', env)
    expect(html).not.toMatch(/<p[^>]*>\s*<img/)
    expect(html).toMatch(/^<img/)
  })

  it('段落中 ![[note]] 降级为链接(避免 <div> in <p>)', () => {
    const html = md.render('一段话开头 ![[note-with-emoji]] 一段话结尾\n', env)
    // 不应该输出 transclusion div
    expect(html).not.toContain('class="transclusion"')
    // 应该输出降级链接
    expect(html).toContain('wikilink--inline-transclusion-degraded')
  })

  it('非根 base 会应用到 source link、data URL 和行内降级链接', () => {
    const options = resolveOptions({
      srcDir: VAULT,
      cleanUrls: true,
      base: '/docs/',
    })
    const index = scanVault(options)
    const local = makeMd(options, index)

    const block = local.md.render('![[Note A#一级标题]]\n', local.env)
    expect(block).toContain('href="/docs/Note%20A#一级标题"')
    expect(block).toContain('data-source-url="/docs/Note%20A#一级标题"')

    const inline = local.md.render(
      '前文 ![[note-with-emoji]] 后文\n',
      local.env,
    )
    expect(inline).toContain('href="/docs/note-with-emoji"')
  })

  it('段落中 ![[image.png]] 仍可作 inline 图片', () => {
    const html = md.render('前文 ![[image.png]] 后文\n', env)
    expect(html).toContain('<img ')
    // 此处允许 <p><img></p>:img 是 inline 元素,合法
    expect(html).toMatch(/<p[^>]*>[^<]*<img/)
  })

  /**
   * 回归测试 —— 锁住"transclusion 不污染外层 env"。
   *
   * 在 VitePress 里,@mdit-vue/plugin-frontmatter 等插件会在每次 md.render 时
   * 就地 mutate env.frontmatter / env.__data / env.headers。
   * 如果我们的 transclusion childEnv 与 outerEnv 共享这些字段(浅拷贝 spread),
   * 内层 render 会把外层 frontmatter 重置 → VitePress 读不到 → 首页 404。
   *
   * 这里模拟一个会就地写 env.frontmatter 的"外部插件",验证外层数据不丢。
   */
  it('回归:transclusion 不污染外层 env(VitePress 首页 404 的根因)', () => {
    const opts = resolveOptions({ srcDir: VAULT, cleanUrls: true })
    const idx = scanVault(opts)
    const localMd = new MarkdownIt({ html: true })
    localMd.use(allYouNeed, opts)

    // 模拟 @mdit-vue/plugin-frontmatter:在每次 render 开头把
    // env.frontmatter 重置为派生自当前 src 的对象。
    localMd.core.ruler.before('normalize', 'fake_frontmatter', (state) => {
      if (!state.env) return
      const firstLine = state.src.split('\n')[0]!
      ;(state.env as Record<string, unknown>).frontmatter = {
        titleSource: firstLine,
      }
    })

    const outerEnv: Record<string, unknown> & AllYouNeedEnv = {
      index: idx,
      options: opts,
      referencedAssets: new Set(),
    }

    // 整页只有一行 transclusion;外层 firstLine 应是 '![[note-with-emoji]]'
    // 内层 firstLine 是 '# 🎉 Emoji-titled note'
    localMd.render('![[note-with-emoji]]\n', outerEnv)

    expect(
      (outerEnv.frontmatter as { titleSource: string } | undefined)?.titleSource,
    ).toBe('![[note-with-emoji]]')
  })
})
