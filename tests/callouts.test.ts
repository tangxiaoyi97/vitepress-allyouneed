/**
 * v0.3 — Obsidian callouts 解析与渲染测试。
 *
 * 覆盖:
 *   - 13 种 canonical type 都能识别
 *   - 别名(hint/check/error/...)映射到 canonical
 *   - foldable `[!info]+` / `[!info]-` 输出 <details>
 *   - 自定义 title 与默认 title
 *   - 嵌套 callout(`> > [!info]`)
 *   - body 内部 markdown 继续解析(**bold** / [[wikilink]] 等)
 *   - 非 callout 的普通 blockquote 不受影响
 *   - 模块开关 `modules.callouts: false` 时彻底跳过
 */

import { describe, expect, it, beforeAll } from 'vitest'
import nodePath from 'node:path'
import { fileURLToPath } from 'node:url'
import MarkdownIt from 'markdown-it'

import { resolveOptions } from '../src/core/config-bridge.js'
import { scanVault } from '../src/core/vault/index.js'
import allYouNeed from '../src/markdown-it.js'
import {
  parseCalloutHeader,
  normalizeCalloutType,
} from '../src/modules/callouts/index.js'
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

describe('Callouts — header parser', () => {
  it('解析标准 [!note]', () => {
    const r = parseCalloutHeader('[!note]')
    expect(r).toEqual({ type: 'note', foldable: null, title: '' })
  })

  it('解析带 title 的 [!info] Hello', () => {
    const r = parseCalloutHeader('[!info] Hello world')
    expect(r).toEqual({ type: 'info', foldable: null, title: 'Hello world' })
  })

  it('foldable +', () => {
    const r = parseCalloutHeader('[!tip]+ Pro tip')
    expect(r).toEqual({ type: 'tip', foldable: 'open', title: 'Pro tip' })
  })

  it('foldable -', () => {
    const r = parseCalloutHeader('[!warning]- Heads up')
    expect(r).toEqual({
      type: 'warning',
      foldable: 'closed',
      title: 'Heads up',
    })
  })

  it('alias hint → tip', () => {
    expect(normalizeCalloutType('hint')).toBe('tip')
  })

  it('alias check → success', () => {
    expect(normalizeCalloutType('check')).toBe('success')
  })

  it('alias error → danger', () => {
    expect(normalizeCalloutType('error')).toBe('danger')
  })

  it('未知 type 退化到 note', () => {
    expect(normalizeCalloutType('xyz-not-real')).toBe('note')
  })

  it('大小写不敏感', () => {
    const r = parseCalloutHeader('[!INFO] hi')
    expect(r?.type).toBe('info')
  })

  it('非 callout 返回 null', () => {
    expect(parseCalloutHeader('regular text')).toBeNull()
    expect(parseCalloutHeader('[note] missing bang')).toBeNull()
    expect(parseCalloutHeader('[!]')).toBeNull()
  })
})

describe('Callouts — full render pipeline', () => {
  let md: MarkdownIt
  let env: AllYouNeedEnv

  beforeAll(() => {
    const opts = resolveOptions({ srcDir: VAULT, cleanUrls: true })
    const idx = scanVault(opts)
    ;({ md, env } = makeMd(opts, idx))
  })

  it('渲染基础 callout 含 class + icon + content', () => {
    const html = md.render('> [!note] My note\n> body line\n', env)
    expect(html).toContain('class="callout callout--note"')
    expect(html).toContain('data-callout="note"')
    expect(html).toContain('class="callout-icon"')
    expect(html).toContain('class="callout-title-text">My note<')
    expect(html).toContain('class="callout-content"')
    expect(html).toContain('body line')
  })

  it('没自定义 title 时用 DEFAULT_TITLES', () => {
    const html = md.render('> [!warning]\n> body\n', env)
    expect(html).toContain('>Warning<')
  })

  it('foldable + 输出 <details open>', () => {
    const html = md.render('> [!tip]+ Open by default\n> body\n', env)
    expect(html).toContain('<details')
    expect(html).toContain(' open')
    expect(html).toContain('callout--foldable')
    expect(html).toContain('<summary')
  })

  it('foldable - 输出 <details> 不带 open', () => {
    const html = md.render('> [!tip]- Closed by default\n> body\n', env)
    expect(html).toContain('<details')
    expect(html).not.toMatch(/<details[^>]*\sopen[\s>]/)
  })

  it('body 内 markdown 继续解析(粗体)', () => {
    const html = md.render('> [!info]\n> some **bold** text\n', env)
    expect(html).toContain('<strong>bold</strong>')
  })

  it('别名 alias 走 canonical class', () => {
    const html = md.render('> [!check] Done\n> ok\n', env)
    expect(html).toContain('callout--success')
    expect(html).toContain('data-callout="success"')
  })

  it('嵌套 callout(> > [!info])', () => {
    const html = md.render(
      '> [!note] Outer\n> outer body\n>\n> > [!info] Inner\n> > inner body\n',
      env,
    )
    expect(html).toContain('callout--note')
    expect(html).toContain('callout--info')
    expect(html).toContain('outer body')
    expect(html).toContain('inner body')
  })

  it('普通 blockquote 不被吞', () => {
    const html = md.render('> just a quote, no bang\n', env)
    expect(html).toContain('<blockquote>')
    expect(html).not.toContain('class="callout')
  })

  it('13 种 canonical type 都能识别', () => {
    const types = [
      'note',
      'info',
      'tip',
      'success',
      'question',
      'warning',
      'failure',
      'danger',
      'bug',
      'example',
      'quote',
      'abstract',
      'todo',
    ]
    for (const t of types) {
      const html = md.render(`> [!${t}] T\n> body\n`, env)
      expect(html).toContain(`callout--${t}`)
    }
  })

  it('modules.callouts=false 时不处理', () => {
    const opts = resolveOptions({
      srcDir: VAULT,
      cleanUrls: true,
      modules: { callouts: false },
    })
    const idx = scanVault(opts)
    const { md: md2, env: env2 } = makeMd(opts, idx)
    const html = md2.render('> [!info] hi\n> body\n', env2)
    expect(html).not.toContain('class="callout')
    expect(html).toContain('<blockquote>')
  })

  it('callout 内 title 仅占第一行,后续行进 body', () => {
    const html = md.render(
      '> [!info] Title here\n> first body line\n> second body line\n',
      env,
    )
    expect(html).toContain('>Title here<')
    expect(html).toContain('first body line')
    expect(html).toContain('second body line')
    // body 内不应再出现 [!info] 头
    expect(html).not.toContain('[!info]')
  })
})
