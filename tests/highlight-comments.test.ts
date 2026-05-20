/**
 * v0.3 — highlight (`==text==`) + comments (`%%...%%`) 测试。
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
  return {
    md,
    env: { index, options, referencedAssets: new Set() } as AllYouNeedEnv,
  }
}

describe('Highlight — ==text==', () => {
  let md: MarkdownIt
  let env: AllYouNeedEnv

  beforeAll(() => {
    const opts = resolveOptions({ srcDir: VAULT, cleanUrls: true })
    const idx = scanVault(opts)
    ;({ md, env } = makeMd(opts, idx))
  })

  it('基础 ==hello== 渲染 <mark>', () => {
    const html = md.render('this is ==highlighted== text\n', env)
    expect(html).toContain('<mark>highlighted</mark>')
  })

  it('内部 markdown 继续解析:==**bold**==', () => {
    const html = md.render('===**bold inside**==\n', env)
    // 这里前 1 个 `=` 是孤立的,后 4 个 `=` 配对
    // 主要测 mark + strong 嵌套
    const html2 = md.render('==**bold inside**==\n', env)
    expect(html2).toContain('<mark>')
    expect(html2).toContain('<strong>bold inside</strong>')
    expect(html2).toContain('</mark>')
    void html
  })

  it('多个高亮共存', () => {
    const html = md.render('==a== and ==b== and ==c==\n', env)
    const count = (html.match(/<mark>/g) ?? []).length
    expect(count).toBe(3)
  })

  it('未闭合的 == 不渲染', () => {
    const html = md.render('this has ==no close here\n', env)
    expect(html).not.toContain('<mark>')
  })

  it('modules.highlight=false 时不处理', () => {
    const opts = resolveOptions({
      srcDir: VAULT,
      modules: { highlight: false },
    })
    const idx = scanVault(opts)
    const { md: md2, env: env2 } = makeMd(opts, idx)
    const html = md2.render('==no mark==\n', env2)
    expect(html).not.toContain('<mark>')
  })
})

describe('Comments — %%...%%', () => {
  let md: MarkdownIt
  let env: AllYouNeedEnv

  beforeAll(() => {
    const opts = resolveOptions({ srcDir: VAULT, cleanUrls: true })
    const idx = scanVault(opts)
    ;({ md, env } = makeMd(opts, idx))
  })

  it('inline %%comment%% 被去掉', () => {
    const html = md.render('visible %%hidden%% text\n', env)
    expect(html).not.toContain('hidden')
    expect(html).toContain('visible')
    expect(html).toContain('text')
  })

  it('block 形式整段隐藏', () => {
    const html = md.render(
      'before\n\n%%\nmulti\nline\ncomment\n%%\n\nafter\n',
      env,
    )
    expect(html).toContain('before')
    expect(html).toContain('after')
    expect(html).not.toContain('multi')
    expect(html).not.toContain('line')
    expect(html).not.toContain('comment')
  })

  it('未闭合的 %% 在 inline 中不删', () => {
    const html = md.render('this has %%no close\n', env)
    expect(html).toContain('%%no close')
  })

  it('modules.comments=false 时不处理', () => {
    const opts = resolveOptions({
      srcDir: VAULT,
      modules: { comments: false },
    })
    const idx = scanVault(opts)
    const { md: md2, env: env2 } = makeMd(opts, idx)
    const html = md2.render('keep %%comment%% here\n', env2)
    expect(html).toContain('comment')
  })

  it('comment 内部不渲染 markdown', () => {
    const html = md.render('before %%**should not bold**%% after\n', env)
    expect(html).not.toContain('<strong>')
  })
})
