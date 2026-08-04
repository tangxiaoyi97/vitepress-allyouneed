import { beforeEach, describe, expect, it } from 'vitest'
import MarkdownIt from 'markdown-it'
import { fileURLToPath } from 'node:url'

import { resolveOptions } from '../src/core/config-bridge.js'
import { scanVault } from '../src/core/vault/index.js'
import allYouNeed from '../src/markdown-it.js'
import type { AllYouNeedEnv, FileEntry } from '../src/core/types.js'

const VAULT = fileURLToPath(new URL('./fixtures/vault/', import.meta.url))

function setup(): {
  md: MarkdownIt
  env: AllYouNeedEnv
} {
  const options = resolveOptions({ srcDir: VAULT, cleanUrls: true })
  const index = scanVault(options)
  const md = new MarkdownIt({ html: true }).use(allYouNeed, options)
  return {
    md,
    env: { index, options, referencedAssets: new Set() },
  }
}

function findFile(env: AllYouNeedEnv, relativePath: string): FileEntry {
  const entry = Array.from(env.index.files.values()).find(
    (candidate) => candidate.relativePath === relativePath,
  )
  if (!entry) throw new Error(`Missing fixture: ${relativePath}`)
  return entry
}

describe('parser regressions', () => {
  let md: MarkdownIt
  let env: AllYouNeedEnv

  beforeEach(() => {
    ;({ md, env } = setup())
  })

  it('callout preserves later paragraphs, inline markup, and lists', () => {
    const html = md.render(
      [
        '> [!note] Rich body',
        '> first paragraph',
        '>',
        '> second **bold** paragraph',
        '>',
        '> - first item',
        '> - second `code` item',
      ].join('\n'),
      env,
    )

    expect(html).toContain('<p>first paragraph</p>')
    expect(html).toContain('<p>second <strong>bold</strong> paragraph</p>')
    expect(html).toContain('<li>first item</li>')
    expect(html).toContain('<li>second <code>code</code> item</li>')
    expect(html).not.toContain('<p></p>')
    expect(html).not.toContain('<li></li>')
  })

  it('footnote refs in a markdown link label do not violate silent-rule progress', () => {
    const source = '[label[^a]](/target)\n\n[^a]: note'
    expect(() => md.render(source, env)).not.toThrow()
  })

  it('comments in a markdown link label do not violate silent-rule progress', () => {
    expect(() => md.render('[%%hidden%%](/target)', env)).not.toThrow()
  })

  it('seeds the transclusion cycle stack with the root document', () => {
    const cycleA = findFile(env, 'cycle-a.md')
    env.currentPath = cycleA.absolutePath

    const html = md.render('![[cycle-b]]', env)

    expect(html).toContain('<h1>Cycle B</h1>')
    expect(html).toContain('transclusion--cycle')
    // A 已是根页，B 里再引用 A 应立即报循环，不再多渲染一层 A。
    expect(html).not.toContain('<h1>Cycle A</h1>')
  })

  it('namespaces ids and local fragment links for every repeated embed instance', () => {
    const target = findFile(env, 'note-with-emoji.md')
    target.content = [
      '# Embedded heading',
      '',
      'Body with note[^same] ^block',
      '',
      '[^same]: embedded footnote',
    ].join('\n')

    const html = md.render(
      '![[note-with-emoji]]\n\n![[note-with-emoji]]',
      env,
    )
    const ids = Array.from(html.matchAll(/\bid="([^"]+)"/g), (m) => m[1]!)
    const localTargets = Array.from(
      html.matchAll(/\bhref="#([^"]+)"/g),
      (m) => m[1]!,
    )

    expect(ids.length).toBeGreaterThanOrEqual(6)
    expect(new Set(ids).size).toBe(ids.length)
    expect(localTargets.length).toBeGreaterThanOrEqual(4)
    for (const targetId of localTargets) {
      expect(ids).toContain(targetId)
    }
  })
})
