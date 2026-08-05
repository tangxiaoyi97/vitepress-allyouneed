import { afterEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import nodePath from 'node:path'
import MarkdownIt from 'markdown-it'
import { resolveOptions } from '../src/core/config-bridge.js'
import { scanVault, updateFile } from '../src/core/vault/index.js'
import {
  markReferencedAssets,
  scanWikilinks,
} from '../src/core/scan-wikilinks.js'
import { buildVaultData } from '../src/core/views/generate-data.js'
import { generateViewMarkdown } from '../src/core/views/generate-md.js'
import { classifyMediaExt } from '../src/modules/embeds/media.js'
import { normalizeDocTags } from '../src/theme/doc-header.js'
import allYouNeed from '../src/markdown-it.js'
import { registerTagsInline } from '../src/modules/tags/rule.js'
import type { AllYouNeedEnv } from '../src/core/types.js'

const temporaryRoots: string[] = []

afterEach(() => {
  vi.restoreAllMocks()
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

function tempVault(): string {
  const root = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-061-'))
  temporaryRoots.push(root)
  return root
}

function write(root: string, relative: string, content = ''): string {
  const target = nodePath.join(root, relative)
  fs.mkdirSync(nodePath.dirname(target), { recursive: true })
  fs.writeFileSync(target, content)
  return target
}

describe('0.6.1 shared Markdown analysis', () => {
  it('reuses the ingest analysis for dead links and generated data', () => {
    const root = tempVault()
    write(root, 'index.md', '# Home\n\n[[Missing]] #Release')
    const parse = vi.spyOn(MarkdownIt.prototype, 'parse')
    const options = resolveOptions({ srcDir: root, modules: { views: false } })
    const index = scanVault(options)
    const afterIndex = parse.mock.calls.length

    scanWikilinks(index, options)
    buildVaultData(index, options)
    expect(parse.mock.calls.length).toBe(afterIndex)
  })

  it('invalidates cached source when HMR replaces a file entry', () => {
    const root = tempVault()
    const page = write(root, 'index.md', '# Home\n\n#First')
    const options = resolveOptions({ srcDir: root, modules: { views: false } })
    const index = scanVault(options)
    expect(Object.keys(buildVaultData(index, options).tags)).toEqual(['first'])

    fs.writeFileSync(page, '# Home\n\n#Second')
    updateFile(index, page, options)
    expect(Object.keys(buildVaultData(index, options).tags)).toEqual(['second'])
  })
})

describe('0.6.1 view generation', () => {
  it('does not rewrite unchanged generated pages', () => {
    const root = tempVault()
    const options = resolveOptions({ srcDir: root })
    const first = generateViewMarkdown(options)
    expect(first.written).toHaveLength(3)
    const target = first.written[0]!
    const before = fs.statSync(target).mtimeMs
    const second = generateViewMarkdown(options)
    expect(second.written).toEqual([])
    expect(fs.statSync(target).mtimeMs).toBe(before)
  })
})

describe('0.6.1 Obsidian compatibility', () => {
  it('renders standard and arbitrary one-character task statuses', () => {
    const md = new MarkdownIt({ html: true }).use(allYouNeed, {
      modules: { wikilinks: false, embeds: false },
    })
    const html = md.render('- [ ] Open\n- [x] Done\n- [?] Review\n- [✓] Verified')
    expect(html).toContain('class="contains-task-list"')
    expect(html).toContain('class="task-list-item" data-task="?"')
    expect(html).toContain('data-task=" " aria-label="Task status unchecked"')
    expect(html).toContain('data-task="✓" aria-label="Task status ✓" checked')
    expect(html).not.toContain('[?]')
  })

  it('leaves task-like text outside lists and inside code untouched', () => {
    const md = new MarkdownIt().use(allYouNeed)
    const html = md.render('[?] prose\n\n```md\n- [?] code\n```')
    expect(html).toContain('<p>[?] prose</p>')
    expect(html).toContain('- [?] code')
  })

  it('only treats the first paragraph in a list item as its task marker', () => {
    const md = new MarkdownIt().use(allYouNeed)
    const html = md.render('- Ordinary item\n\n  [?] Later paragraph')
    expect(html).not.toContain('task-list-item')
    expect(html).toContain('[?] Later paragraph')
  })

  it('can disable task parsing for third-party task integrations', () => {
    const md = new MarkdownIt().use(allYouNeed, { modules: { tasks: false } })
    expect(md.render('- [?] External')).toContain('[?] External')
  })

  it('scans and classifies the remaining official media formats', () => {
    const root = tempVault()
    for (const file of ['sound.3gp', 'movie.mkv', 'clip.ogv']) write(root, file)
    write(root, 'index.md', '# Media')
    const options = resolveOptions({ srcDir: root })
    const index = scanVault(options)
    expect([...index.assets.values()].map((asset) => asset.extension).sort())
      .toEqual(['3gp', 'mkv', 'ogv'])
    expect(classifyMediaExt('3GP')).toBe('audio')
    expect(classifyMediaExt('MKV')).toBe('video')
    expect(classifyMediaExt('OGV')).toBe('video')
  })

  it('links a plain attachment without adding a Graph page edge', () => {
    const root = tempVault()
    const page = write(root, 'index.md', '# Home\n\n[[files/Guide.pdf|Download guide]]')
    write(root, 'files/Guide.pdf', '%PDF-1.4')
    write(root, 'files/Guide.pdf.md', '# Same-looking note')
    const options = resolveOptions({
      srcDir: root,
      base: '/docs/',
      cleanUrls: true,
      modules: { views: false },
    })
    const index = scanVault(options)
    const md = new MarkdownIt({ html: true }).use(allYouNeed, options)
    const html = md.render(index.byRelativePath.get('index.md')!.content, {
      index,
      options,
      currentPath: page,
      referencedAssets: new Set(),
    } satisfies AllYouNeedEnv)
    expect(html).toContain('class="wikilink wikilink--attachment"')
    expect(html).toContain('href="/_assets/Guide.pdf"')
    expect(html).toContain('>Download guide</a>')
    expect(scanWikilinks(index, options).dead).toEqual([])
    expect(buildVaultData(index, options).edges).toEqual([])
  })

  it('does not mistake headings ending in asset extensions for files', () => {
    const root = tempVault()
    const page = write(
      root,
      'index.md',
      '# image.png\n\n[[Target#manual.pdf]] [[#image.png]] [[report#final.pdf]]',
    )
    write(root, 'Target.md', '# manual.pdf')
    write(root, 'report#final.pdf', '%PDF-1.4')
    const options = resolveOptions({
      srcDir: root,
      cleanUrls: true,
      modules: { views: false },
    })
    const index = scanVault(options)
    const md = new MarkdownIt({ html: true }).use(allYouNeed, options)
    const html = md.render(index.byRelativePath.get('index.md')!.content, {
      index,
      options,
      currentPath: page,
      referencedAssets: new Set(),
    } satisfies AllYouNeedEnv)

    expect(html.match(/wikilink--attachment/g)).toHaveLength(1)
    expect(html).toContain('href="/Target#manual-pdf"')
    expect(html).toContain('href="/#image-png"')
    expect(scanWikilinks(index, options).dead).toEqual([])
    expect(buildVaultData(index, options).edges).toEqual([
      { source: 'index.md', target: 'Target.md', type: 'wikilink' },
    ])
  })

  it('pre-emits only enabled assets after applying target hooks', () => {
    const root = tempVault()
    write(root, 'index.md', '# Home\n\n[[download|**Guide**]] ![[preview.png]]')
    write(root, 'files/Guide.pdf', '%PDF-1.4')
    write(root, 'preview.png', 'raw preview')
    write(root, 'actual.png', 'processed preview')
    const options = resolveOptions({
      srcDir: root,
      modules: { views: false },
      wikilinks: {
        postProcessLinkTarget: (target) =>
          target === 'download' ? 'files/Guide.pdf' : target,
        allowLinkLabelFormatting: true,
        htmlAttributes: { target: '_blank' },
      },
      embeds: {
        postProcessImageTarget: (target) =>
          target === 'preview.png' ? 'actual.png' : target,
      },
    })
    const index = scanVault(options)

    expect(markReferencedAssets(index, options)).toBe(2)
    expect(index.assetsByRelativePath.get('files/Guide.pdf')!.referencedBy.size)
      .toBe(1)
    expect(index.assetsByRelativePath.get('actual.png')!.referencedBy.size)
      .toBe(1)
    expect(index.assetsByRelativePath.get('preview.png')!.referencedBy.size)
      .toBe(0)
    expect(scanWikilinks(index, options).dead).toEqual([])

    const md = new MarkdownIt({ html: true }).use(allYouNeed, options)
    const html = md.render(index.byRelativePath.get('index.md')!.content, {
      index,
      options,
      currentPath: nodePath.join(root, 'index.md'),
      referencedAssets: new Set(),
    } satisfies AllYouNeedEnv)
    expect(html).toContain('class="wikilink wikilink--attachment"')
    expect(html).toContain('href="/_assets/Guide.pdf"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('<strong>Guide</strong>')
  })

  it('does not publish vault assets when both link syntaxes are disabled', () => {
    const root = tempVault()
    write(root, 'index.md', '# Home\n\n[[secret.pdf]] ![[secret.png]] [[Visible]]')
    write(root, 'secret.pdf', '%PDF-1.4')
    write(root, 'secret.png', 'not public')
    write(root, 'Visible.md', '# Visible')
    const options = resolveOptions({
      srcDir: root,
      modules: { wikilinks: false, embeds: false, views: false },
    })
    const index = scanVault(options)

    expect(markReferencedAssets(index, options)).toBe(0)
    for (const asset of index.assets.values()) {
      expect(asset.referencedBy.size).toBe(0)
    }
    expect(scanWikilinks(index, options)).toMatchObject({ total: 0, dead: [] })
    expect(buildVaultData(index, options).edges).toEqual([])
  })

  it('keeps canonical tag keys but displays first-seen spelling', () => {
    const root = tempVault()
    const first = write(root, 'a.md', '---\ntags: [Release]\n---\n# A\n\n#RELEASE #NextTag')
    write(root, 'b.md', '# B\n\n#release')
    const options = resolveOptions({ srcDir: root })
    const index = scanVault(options)
    const data = buildVaultData(index, options)
    expect(Object.keys(data.tags)).toEqual(['release', 'nexttag'])
    expect(data.tags.release?.label).toBe('Release')
    expect(data.tags.nexttag?.label).toBe('NextTag')

    const md = new MarkdownIt({ html: true })
    registerTagsInline(md)
    const rendered = md.renderInline('#MixedCase', { index, options } as AllYouNeedEnv)
    expect(rendered).toContain('data-tag="mixedcase"')
    expect(rendered).toContain('>#MixedCase</a>')
    expect(normalizeDocTags(['Release', 'release', '#NextTag']))
      .toEqual(['Release', 'NextTag'])

    fs.writeFileSync(first, '---\ntags: [Release]\n---\n# A updated\n\n#RELEASE')
    updateFile(index, first, options)
    expect(buildVaultData(index, options).tags.release?.label).toBe('Release')
  })
})
