import fs from 'node:fs'
import nodePath from 'node:path'
import os from 'node:os'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { resolveOptions } from '../src/core/config-bridge.js'
import { scanVault } from '../src/core/vault/index.js'
import { buildVaultData, writeVaultData } from '../src/core/views/generate-data.js'
import { generateViewMarkdown } from '../src/core/views/generate-md.js'
import { generateSidebar } from '../src/core/sidebar-auto/index.js'
import type { SidebarItem } from '../src/core/sidebar-auto/index.js'

const temporaryDirectories: string[] = []

afterEach(() => {
  vi.restoreAllMocks()
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

function tempVault(): string {
  const directory = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-comprehensive-'))
  temporaryDirectories.push(directory)
  return directory
}

function write(root: string, relativePath: string, content: string): void {
  const target = nodePath.join(root, relativePath)
  fs.mkdirSync(nodePath.dirname(target), { recursive: true })
  fs.writeFileSync(target, content, 'utf8')
}

describe('view data follows rendered Markdown semantics', () => {
  it('ignores links/tags in code and comments and excludes _sidebar.md nodes', () => {
    const root = tempVault()
    write(root, 'A.md', [
      '# A',
      '[[B]] #real',
      '`[[Ghost]] #inline-code`',
      '```css',
      '.x { color: #d97706 } /* [[Ghost]] */',
      '```',
      '#real-after-fence',
      '%% [[Ghost]] #obsidian-comment %%',
      '<!-- [[Ghost]] #html-comment -->',
    ].join('\n'))
    write(root, 'B.md', '# B\n')
    write(root, '_sidebar.md', '- [[B]] #navigation\n')

    const options = resolveOptions({ srcDir: root, cleanUrls: true })
    const data = buildVaultData(scanVault(options), options)

    expect(data.nodes.map((node) => node.id).sort()).toEqual(['A.md', 'B.md'])
    expect(data.edges).toEqual([
      expect.objectContaining({ source: 'A.md', target: 'B.md' }),
    ])
    expect(Object.keys(data.tags).sort()).toEqual(['real', 'real-after-fence'])
    expect(data.stats.totalFiles).toBe(2)
  })

  it('uses the shared contextual resolver for ambiguous basenames', () => {
    const root = tempVault()
    write(root, 'B.md', '# Root B\n')
    write(root, 'sub/A.md', '# A\n[[B]]\n')
    write(root, 'sub/B.md', '# Nearby B\n')

    const options = resolveOptions({ srcDir: root, cleanUrls: true })
    const data = buildVaultData(scanVault(options), options)

    expect(data.edges).toContainEqual({
      source: 'sub/A.md',
      target: 'sub/B.md',
      type: 'wikilink',
    })
  })

  it('writes into Vite custom publicDir when supplied', () => {
    const root = tempVault()
    const customPublic = nodePath.join(root, 'site-static')
    write(root, 'A.md', '# A\n')
    const options = resolveOptions({ srcDir: root })

    const report = writeVaultData(scanVault(options), options, customPublic)

    expect(report.path).toBe(nodePath.join(customPublic, 'vault-data.json'))
    expect(fs.existsSync(report.path)).toBe(true)
  })
})

describe('generated view Markdown is safe and configurable', () => {
  it('quotes YAML titles and forwards a custom data file name to every component', () => {
    const root = tempVault()
    write(root, 'A.md', '# A\n')
    const options = resolveOptions({
      srcDir: root,
      views: {
        dataFileName: 'custom & data.json',
        sidebarText: {
          group: 'Views',
          graph: 'Graph: #all [map]',
          stats: 'Stats: #all [summary]',
          tags: 'Tags: #all [list]',
        },
      },
    })

    generateViewMarkdown(options, scanVault(options))

    const prefix = nodePath.join(root, options.views.urlPrefix)
    const graph = fs.readFileSync(nodePath.join(prefix, `${options.views.names.graph}.md`), 'utf8')
    const stats = fs.readFileSync(nodePath.join(prefix, `${options.views.names.stats}.md`), 'utf8')
    const tags = fs.readFileSync(nodePath.join(prefix, `${options.views.names.tags}.md`), 'utf8')
    expect(graph).toContain('title: "Graph: #all [map]"')
    expect(graph).toContain('data-file-name="custom &amp; data.json"')
    expect(stats).toContain('data-file-name="custom &amp; data.json"')
    expect(tags).toContain('data-file-name="custom &amp; data.json"')
  })
})

describe('folder link candidates remain reachable', () => {
  it('omits only the winning candidate in tree, flat, and per-folder layouts', () => {
    const root = tempVault()
    write(root, 'tour/tour.md', '# Tour Home\n')
    write(root, 'tour/index.md', '# Alternate Index\n')
    write(root, 'tour/README.md', '# Read Me\n')
    write(root, 'tour/topic.md', '# Topic\n')
    const options = resolveOptions({ srcDir: root, cleanUrls: true })
    const index = scanVault(options)

    const layouts = ['tree', 'flat'] as const
    for (const layout of layouts) {
      if (layout === 'flat') vi.spyOn(console, 'warn').mockImplementation(() => {})
      const sidebar = generateSidebar(index, options, { layout }) as SidebarItem[]
      const group = sidebar.find((item) => item.text === 'Tour Home')
      const labels = group?.items?.map((item) => item.text) ?? []
      expect(labels).toEqual(expect.arrayContaining(['Alternate Index', 'Read Me', 'Topic']))
      expect(labels).not.toContain('Tour Home')
    }

    const perFolder = generateSidebar(index, options, {
      layout: 'per-folder',
    }) as Record<string, SidebarItem[]>
    const labels = perFolder['/tour/']?.flatMap((item) => [item.text, ...(item.items?.map((nested) => nested.text) ?? [])])
    expect(labels).toEqual(expect.arrayContaining(['Alternate Index', 'Read Me', 'Topic']))
    expect(labels?.filter((label) => label === 'Tour Home')).toHaveLength(1)
  })
})
