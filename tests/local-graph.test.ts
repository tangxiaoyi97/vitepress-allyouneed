import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { resolveOptions } from '../src/core/config-bridge.js'
import { defineConfigWithAllYouNeed } from '../src/vitepress.js'
import {
  buildLocalGraph,
  findCurrentNodeId,
  isLocalGraphPageEligible,
  layoutLocalGraph,
  resolveLocalGraphConfig,
} from '../src/theme/local-graph.js'
import type { VaultData } from '../src/theme/types.js'

const data: VaultData = {
  nodes: [
    { id: 'en/a.md', title: 'A', url: '/en/a', tags: [], mtime: 0 },
    { id: 'en/b.md', title: 'B', url: '/en/b', tags: [], mtime: 0 },
    { id: 'en/c.md', title: 'C', url: '/en/c', tags: [], mtime: 0 },
    { id: 'en/d.md', title: 'D', url: '/en/d', tags: [], mtime: 0 },
  ],
  edges: [
    { source: 'en/a.md', target: 'en/b.md', type: 'wikilink' },
    { source: 'en/c.md', target: 'en/a.md', type: 'transclusion' },
    { source: 'en/b.md', target: 'en/d.md', type: 'wikilink' },
  ],
  tags: {},
  stats: {
    totalFiles: 4,
    totalAssets: 0,
    totalWikilinks: 3,
    totalTags: 0,
    totalWarnings: 0,
    mostRecent: [],
  },
  meta: { generatedAt: 0, pluginVersion: 'test' },
}
const testDir = dirname(fileURLToPath(import.meta.url))

describe('views.localGraph config', () => {
  it('resolves the public defaults', () => {
    expect(resolveOptions().views.localGraph).toEqual({
      enabled: false,
      depth: 1,
      maxNodes: 24,
      modalDepth: 2,
      modalMaxNodes: 100,
      mobile: 'button',
    })
    expect(resolveLocalGraphConfig(undefined)).toEqual(
      resolveOptions().views.localGraph,
    )
  })

  it('supports hidden mobile mode and clamps runtime depth to 1..2', () => {
    const options = resolveOptions({
      views: {
        localGraph: {
          enabled: true,
          depth: 2,
          maxNodes: 12,
          modalDepth: 1,
          modalMaxNodes: 50,
          mobile: 'hidden',
        },
      },
    })
    expect(options.views.localGraph).toEqual({
      enabled: true,
      depth: 2,
      maxNodes: 12,
      modalDepth: 1,
      modalMaxNodes: 50,
      mobile: 'hidden',
    })
    expect(resolveLocalGraphConfig({ depth: 99 as 2, modalDepth: 0 as 1 })).toMatchObject({
      depth: 2,
      modalDepth: 1,
    })
  })

  it('bridges plugin options into root and locale theme configs', () => {
    const srcDir = mkdtempSync(join(tmpdir(), 'ayn-local-graph-'))
    try {
      const config = defineConfigWithAllYouNeed({
        srcDir,
        themeConfig: {},
        locales: {
          root: { themeConfig: { nav: [] } },
          zh: { link: '/zh/', themeConfig: { allyouneed: { custom: true } } },
        },
      }, {
        sidebarAuto: { mode: 'off' },
        views: {
          dataFileName: 'graph-data.json',
          localGraph: { enabled: true, mobile: 'hidden' },
        },
      })
      const root = config.themeConfig as Record<string, any>
      expect(root.allyouneed.dataFileName).toBe('graph-data.json')
      expect(root.allyouneed.localGraph.enabled).toBe(true)
      expect(root.allyouneed.localGraph.mobile).toBe('hidden')
      const zh = config.locales?.zh?.themeConfig as Record<string, any>
      expect(zh.allyouneed.custom).toBe(true)
      expect(zh.allyouneed.localGraph.enabled).toBe(true)
    } finally {
      rmSync(srcDir, { recursive: true, force: true })
    }
  })
})

describe('local graph data selection', () => {
  it('treats incoming and outgoing links as neighbors and respects depth', () => {
    const oneHop = buildLocalGraph(data, 'en/a.md', 1, 24)!
    expect(oneHop.nodes.map((node) => node.id)).toEqual([
      'en/a.md',
      'en/b.md',
      'en/c.md',
    ])
    expect(oneHop.edges).toHaveLength(2)

    const twoHop = buildLocalGraph(data, 'en/a.md', 2, 24)!
    expect(twoHop.nodes.map((node) => node.id)).toContain('en/d.md')
  })

  it('uses deterministic id ordering when maxNodes truncates the BFS', () => {
    const first = buildLocalGraph(data, 'en/a.md', 2, 2)!
    const second = buildLocalGraph(data, 'en/a.md', 2, 2)!
    expect(first).toEqual(second)
    expect(first.nodes.map((node) => node.id)).toEqual(['en/a.md', 'en/b.md'])
  })

  it('lays out the preview deterministically without a force simulation', () => {
    const slice = buildLocalGraph(data, 'en/a.md', 2, 24)!
    expect(layoutLocalGraph(slice)).toEqual(layoutLocalGraph(slice))
    expect(layoutLocalGraph(slice).find((node) => node.id === 'en/a.md')).toMatchObject({
      x: 120,
      y: 75,
      distance: 0,
    })

    const source = readFileSync(
      resolve(testDir, '../src/theme/components/LocalGraph.vue'),
      'utf8',
    )
    expect(source).not.toContain("from 'd3-force'")
    expect(source).toContain("import('./LocalGraphModal.vue')")
  })
})

describe('local graph page and route matching', () => {
  const names = { graph: 'graph', stats: 'stats', tags: 'tags' }

  it('hides home, Perspectives and aside:false pages', () => {
    expect(isLocalGraphPageEligible('index.md', { layout: 'home' }, '_perspectives_', names)).toBe(false)
    expect(isLocalGraphPageEligible('_perspectives_/graph.md', {}, '_perspectives_', names)).toBe(false)
    expect(isLocalGraphPageEligible('notes/a.md', { aside: false }, '_perspectives_', names)).toBe(false)
    expect(isLocalGraphPageEligible('notes/a.md', {}, '_perspectives_', names)).toBe(true)
    expect(isLocalGraphPageEligible('graph.md', {}, '', names)).toBe(false)
  })

  it('prefers source relativePath and falls back to base-aware i18n routes', () => {
    expect(findCurrentNodeId(data, 'en/a.md', '/docs/en/a', '/docs/')).toBe('en/a.md')
    expect(findCurrentNodeId(data, '', '/docs/en/b', '/docs/')).toBe('en/b.md')
    expect(findCurrentNodeId(data, '', '/docs/en/missing', '/docs/')).toBeNull()
  })
})
