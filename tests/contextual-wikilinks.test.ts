/**
 * Basename-only Wikilinks must resolve relative to their source page before the
 * global onConflict policy is applied. This protects multi-locale vaults where
 * sections intentionally reuse filenames (for example themen/Foo.md and
 * selfcheck/Foo.md).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import nodePath from 'node:path'
import os from 'node:os'
import MarkdownIt from 'markdown-it'

import { resolveOptions } from '../src/core/config-bridge.js'
import { resolveWikilink } from '../src/core/resolver.js'
import { scanVault } from '../src/core/vault/index.js'
import allYouNeed from '../src/markdown-it.js'
import type {
  AllYouNeedEnv,
  ResolvedOptions,
  VaultIndex,
} from '../src/core/types.js'

describe('context-aware basename Wikilinks', () => {
  let tmp: string
  let options: ResolvedOptions
  let index: VaultIndex

  beforeAll(() => {
    tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-context-'))

    write('index.md', '# Home')
    write('themen/Source.md', '# Themen source\n\n[[Gravitationsphysik]]')
    write('themen/nested/Source.md', '# Nested source')
    write('themen/Gravitationsphysik.md', '# Gravitation Themen')
    write('selfcheck/Source.md', '# Selfcheck source')
    write('selfcheck/Gravitationsphysik.md', '# Gravitation Selfcheck')

    write('zh/themen/Source.md', '# 中文讲义 source')
    write('zh/themen/Gravitationsphysik.md', '# 中文讲义 Gravitation')
    write('zh/selfcheck/Source.md', '# 中文自测 source')
    write('zh/selfcheck/Gravitationsphysik.md', '# 中文自测 Gravitation')

    // No same-directory candidate: longest common prefix must still keep the
    // source in its section / locale before onConflict runs.
    write('themen/AreaTarget.md', '# Themen area target')
    write('selfcheck/AreaTarget.md', '# Selfcheck area target')
    write('LocaleTarget.md', '# Root locale target')
    write('zh/themen/LocaleTarget.md', '# ZH Themen locale target')
    write('zh/selfcheck/LocaleTarget.md', '# ZH Selfcheck locale target')
    write('zh/misc/Source.md', '# ZH misc source')

    options = resolveOptions({
      srcDir: tmp,
      cleanUrls: true,
      onConflict: 'shortest',
    })
    index = scanVault(options)
  })

  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it('prefers the source directory in the root locale', () => {
    expect(resolveFrom('Gravitationsphysik', 'themen/Source.md')).toBe(
      'themen/Gravitationsphysik.md',
    )
    expect(resolveFrom('Gravitationsphysik', 'selfcheck/Source.md')).toBe(
      'selfcheck/Gravitationsphysik.md',
    )
  })

  it('prefers both locale and section in a locale subtree', () => {
    expect(resolveFrom('Gravitationsphysik', 'zh/themen/Source.md')).toBe(
      'zh/themen/Gravitationsphysik.md',
    )
    expect(resolveFrom('Gravitationsphysik', 'zh/selfcheck/Source.md')).toBe(
      'zh/selfcheck/Gravitationsphysik.md',
    )
  })

  it('uses the longest shared directory prefix for nested sources', () => {
    expect(resolveFrom('AreaTarget', 'themen/nested/Source.md')).toBe(
      'themen/AreaTarget.md',
    )
  })

  it('keeps candidates in the same locale before applying onConflict', () => {
    const target = resolveFrom('LocaleTarget', 'zh/misc/Source.md')
    expect(target).toMatch(/^zh\//)
  })

  it("onConflict='error' runs after contextual narrowing", () => {
    const strictOptions = resolveOptions({
      srcDir: tmp,
      cleanUrls: true,
      onConflict: 'error',
    })
    const result = resolveWikilink(
      'Gravitationsphysik',
      index,
      strictOptions,
      'page',
      absolute('themen/Source.md'),
    )
    expect(result.isDead).toBe(false)
    expect(result.target?.relativePath).toBe('themen/Gravitationsphysik.md')
  })

  it('preserves an explicit path even when it crosses sections', () => {
    const result = resolveWikilink(
      'selfcheck/Gravitationsphysik',
      index,
      options,
      'page',
      absolute('themen/Source.md'),
    )
    expect(result.target?.relativePath).toBe('selfcheck/Gravitationsphysik.md')
  })

  it('maps an ambiguous relative source path to the root locale exactly', () => {
    const result = resolveWikilink(
      'Gravitationsphysik',
      index,
      options,
      'page',
      'themen/Source.md',
    )
    expect(result.target?.relativePath).toBe('themen/Gravitationsphysik.md')
  })

  it('renders the corrected href through the markdown-it rule', () => {
    const md = new MarkdownIt({ html: true }).use(allYouNeed, options)
    const env: AllYouNeedEnv = {
      index,
      options,
      currentPath: absolute('themen/Source.md'),
      referencedAssets: new Set(),
    }
    const html = md.renderInline('[[Gravitationsphysik|Gravitation]]', env)
    expect(html).toContain('href="/themen/Gravitationsphysik"')
    expect(html).not.toContain('/selfcheck/Gravitationsphysik')
  })

  function resolveFrom(target: string, source: string): string | undefined {
    return resolveWikilink(
      target,
      index,
      options,
      'page',
      absolute(source),
    ).target?.relativePath
  }

  function absolute(relativePath: string): string {
    return nodePath.join(tmp, ...relativePath.split('/'))
  }

  function write(relativePath: string, content: string): void {
    const path = absolute(relativePath)
    fs.mkdirSync(nodePath.dirname(path), { recursive: true })
    fs.writeFileSync(path, content, 'utf8')
  }
})
