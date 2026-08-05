import fs from 'node:fs'
import nodePath from 'node:path'
import { fileURLToPath } from 'node:url'
import MarkdownIt from 'markdown-it'
import { describe, expect, it } from 'vitest'

import { resolveOptions } from '../src/core/config-bridge.js'
import { resolveWikilink } from '../src/core/resolver.js'
import { scanWikilinks } from '../src/core/scan-wikilinks.js'
import type { AllYouNeedEnv } from '../src/core/types.js'
import { scanVault } from '../src/core/vault/index.js'
import { buildVaultData } from '../src/core/views/generate-data.js'
import { stripNonContentMarkdown } from '../src/core/markdown-content.js'
import allYouNeedMarkdownIt from '../src/markdown-it.js'
import { registerTagsInline } from '../src/modules/tags/index.js'

const here = nodePath.dirname(fileURLToPath(import.meta.url))
const vault = nodePath.join(here, 'fixtures', 'obsidian-golden')
const expected = JSON.parse(
  fs.readFileSync(nodePath.join(vault, 'golden.json'), 'utf8'),
) as {
  blockIds: string[]
  links: Record<string, string>
  tags: string[]
  deadTargets: string[]
}

function setup() {
  const options = resolveOptions({ srcDir: vault, cleanUrls: true, deadLink: 'silent' })
  const index = scanVault(options)
  const md = new MarkdownIt({ html: true })
  allYouNeedMarkdownIt(md, options)
  registerTagsInline(md)
  const source = index.byRelativePath.get('source.md')!
  const target = index.byRelativePath.get('target.md')!
  const env: AllYouNeedEnv = {
    index,
    options,
    currentPath: source.absolutePath,
    referencedAssets: new Set(),
  }
  return { options, index, md, source, target, env }
}

describe('official Obsidian syntax golden fixture', () => {
  it('indexes block ids and resolves blocks plus hierarchical headings', () => {
    const { options, index, target } = setup()
    const links = {
      parentChild: resolveWikilink('target#Parent#Child', index, options).url,
      otherChild: resolveWikilink('target#Other#Child', index, options).url,
      paragraph: resolveWikilink('target#^paragraph', index, options).url,
      selfHierarchy: resolveWikilink(
        '#Other#Child',
        index,
        options,
        'page',
        target.absolutePath,
      ).url,
    }
    expect([...target.blockIds.keys()].sort()).toEqual(expected.blockIds)
    expect(links).toEqual(expected.links)
    expect(index.blockIds.get(target.absolutePath)).toBe(target.blockIds)
  })

  it('renders standalone paragraph/list/quote/callout/table block anchors', () => {
    const { md, target, env } = setup()
    env.currentPath = target.absolutePath
    const html = md.render(target.content, env)
    for (const id of expected.blockIds) expect(html).toContain(`id="^${id}"`)
    expect(html).not.toMatch(/>\^\w+</)
  })

  it('transcludes an addressed list block and a hierarchical heading section', () => {
    const { md, env } = setup()
    const list = md.render('![[target#^list]]\n', env)
    expect(list).toContain('First list item')
    expect(list).toContain('Second list item')
    expect(list).not.toContain('Paragraph block lives here')

    const heading = md.render('![[target#Other#Child]]\n', env)
    expect(heading).toContain('Child under Other')
    expect(heading).not.toContain('Child under Parent')
  })

  it('preserves PDF page fragments and applies PDF height fragments', () => {
    const { md, env } = setup()
    const page = md.render('![[document.pdf#page=3]]\n', env)
    expect(page).toMatch(/src="[^"]+document\.pdf#page=3"/)
    const height = md.render('![[document.pdf#height=420]]\n', env)
    expect(height).toContain('height:420px')
    const combined = md.render('![[document.pdf#page=3&height=420]]\n', env)
    expect(combined).toMatch(/src="[^"]+document\.pdf#page=3"/)
    expect(combined).toContain('height:420px')
  })

  it('renders multiline definitions and inline footnotes', () => {
    const { md, env } = setup()
    const html = md.render(
      'Inline ^[inline **bold**] and ^[nested [link](/docs)].\n\nRef[^m].\n\n[^m]: first\n  second **line**\n\n  third\n',
      env,
    )
    expect(html).toContain('inline <strong>bold</strong>')
    expect(html).toContain('nested <a href="/docs">link</a>')
    expect(html).toContain('second <strong>line</strong>')
    expect(html).toContain('<p>third</p>')
    expect(html.match(/class="ayn-footnote-item"/g)).toHaveLength(3)
  })

  it('normalizes Unicode/emoji/mixed-numeric tags and shares non-content cleanup', () => {
    const { index, options, md, source, env } = setup()
    const data = buildVaultData(index, options)
    expect(Object.keys(data.tags).sort()).toEqual(expected.tags)
    const report = scanWikilinks(index, options)
    expect(report.dead.map((item) => item.target).sort()).toEqual(expected.deadTargets)

    const html = md.render(source.content, env)
    expect(html).toContain('>#release2<')
    expect(html).toContain('>#team/🚀<')
    expect(html).toContain('>#team/👍🏽<')
    expect(html).toContain('#404 ')
    expect(html).toContain('>#404error<')
  })

  it('excludes indented code without dropping nested list content', () => {
    const cleaned = stripNonContentMarkdown([
      '    [[missing-indented]] #fake-indented',
      '',
      '- Parent',
      '    - [[real-nested]] #real-nested',
      '',
    ].join('\n'))
    expect(cleaned).not.toContain('missing-indented')
    expect(cleaned).not.toContain('fake-indented')
    expect(cleaned).toContain('[[real-nested]] #real-nested')
  })

  it('keeps two/four-space, tab, and multi-paragraph footnote continuations', () => {
    const cleaned = stripNonContentMarkdown([
      '[^note]: first',
      '  [[two-space]] #two-space',
      '    [[four-space]] #four-space',
      '\t[[tab-indented]] #tab-indented',
      '',
      '        [[footnote-code]] #footnote-code',
      '',
      '  [[second-paragraph]] #second-paragraph',
      '',
      'After the footnote.',
      '',
      '    [[actual-code]] #actual-code',
      '',
    ].join('\n'))
    expect(cleaned).toContain('[[two-space]] #two-space')
    expect(cleaned).toContain('[[four-space]] #four-space')
    expect(cleaned).toContain('[[tab-indented]] #tab-indented')
    expect(cleaned).toContain('[[second-paragraph]] #second-paragraph')
    expect(cleaned).not.toContain('footnote-code')
    expect(cleaned).not.toContain('actual-code')
  })
})
