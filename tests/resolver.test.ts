/**
 * Resolver 单元测试。
 */

import { describe, expect, it, beforeAll } from 'vitest'
import nodePath from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveOptions } from '../src/core/config-bridge.js'
import { scanVault } from '../src/core/vault/index.js'
import { resolveWikilink, resolveAsset } from '../src/core/resolver.js'
import type { VaultIndex, ResolvedOptions } from '../src/core/types.js'

const here = nodePath.dirname(fileURLToPath(import.meta.url))
const VAULT = nodePath.join(here, 'fixtures', 'vault')

describe('Resolver — wikilinks', () => {
  let index: VaultIndex
  let options: ResolvedOptions

  beforeAll(() => {
    options = resolveOptions({
      srcDir: VAULT,
      cleanUrls: true,
      onConflict: 'shortest',
    })
    index = scanVault(options)
  })

  it('basename 命中(顶层 Note A 比 deeper 浅)', () => {
    const r = resolveWikilink('Note A', index, options)
    expect(r.isDead).toBe(false)
    expect(r.target!.relativePath).toBe('Note A.md')
    expect(r.url).toBe('/Note%20A')
  })

  it('alias 优先于 basename', () => {
    const r = resolveWikilink('NA', index, options)
    expect(r.isDead).toBe(false)
    expect(r.target!.basename).toBe('Note A')
  })

  it('alias 大小写不敏感', () => {
    const r = resolveWikilink('na', index, options)
    expect(r.isDead).toBe(false)
  })

  it('路径形式精确命中', () => {
    const r = resolveWikilink('notes/projects/c', index, options)
    expect(r.isDead).toBe(false)
    expect(r.target!.relativePath).toBe('notes/projects/c.md')
  })

  it('剥 .md 扩展名', () => {
    const r = resolveWikilink('Note A.md', index, options)
    expect(r.isDead).toBe(false)
    expect(r.target!.basename).toBe('Note A')
  })

  it('中文 basename 可解析', () => {
    const r = resolveWikilink('中文笔记', index, options)
    expect(r.isDead).toBe(false)
    expect(r.url).toContain('%E4%B8%AD%E6%96%87%E7%AC%94%E8%AE%B0')
  })

  it('heading slug 匹配', () => {
    const r = resolveWikilink('Note A#一级标题', index, options)
    expect(r.isDead).toBe(false)
    expect(r.hasUnmatchedAnchor).toBe(false)
    expect(r.url).toContain('#一级标题')
  })

  it('未匹配 heading → hasUnmatchedAnchor', () => {
    const r = resolveWikilink('Note A#不存在', index, options)
    expect(r.isDead).toBe(false)
    expect(r.hasUnmatchedAnchor).toBe(true)
  })

  it('死链', () => {
    const r = resolveWikilink('彻底不存在的笔记', index, options)
    expect(r.isDead).toBe(true)
  })

  it("onConflict='first' 取扫描顺序第一个", () => {
    const opt = resolveOptions({
      srcDir: VAULT,
      cleanUrls: true,
      onConflict: 'first',
    })
    const idx = scanVault(opt)
    const r = resolveWikilink('Note A', idx, opt)
    expect(r.isDead).toBe(false)
  })

  it("onConflict='error' 在冲突时返回死链", () => {
    const opt = resolveOptions({
      srcDir: VAULT,
      cleanUrls: true,
      onConflict: 'error',
    })
    const idx = scanVault(opt)
    const r = resolveWikilink('Note A', idx, opt)
    expect(r.isDead).toBe(true)
  })
})

describe('Resolver — assets', () => {
  let index: VaultIndex
  let options: ResolvedOptions

  beforeAll(() => {
    options = resolveOptions({ srcDir: VAULT, cleanUrls: true })
    index = scanVault(options)
  })

  it('按 basename 找到 image', () => {
    const r = resolveAsset('image.png', index, options)
    expect(r.asset).toBeDefined()
    expect(r.asset!.relativePath).toBe('assets/image.png')
  })

  it('按路径找到 image', () => {
    const r = resolveAsset('assets/image.png', index, options)
    expect(r.asset).toBeDefined()
  })

  it('找不到 → asset undefined', () => {
    const r = resolveAsset('no-such-image.png', index, options)
    expect(r.asset).toBeUndefined()
  })
})
