import fs from 'node:fs'
import nodePath from 'node:path'
import os from 'node:os'
import MarkdownIt from 'markdown-it'
import { afterEach, describe, expect, it } from 'vitest'
import { build as viteBuild } from 'vite'

import { buildAssetOutputPath, buildPlaceholderUrl } from '../src/core/asset-pipeline/build-emit.js'
import { resolveOptions } from '../src/core/config-bridge.js'
import { logDeadLinks } from '../src/core/scan-wikilinks.js'
import type { AssetEntry } from '../src/core/types.js'
import { buildIgnorer } from '../src/core/vault/ignore.js'
import { removeFile, scanVault } from '../src/core/vault/index.js'
import { defineConfigWithAllYouNeed } from '../src/vitepress.js'
import { viteAllYouNeed } from '../src/vite.js'

const temporaryDirs: string[] = []

function tempDir(): string {
  const dir = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-core-reg-'))
  temporaryDirs.push(dir)
  return dir
}

function write(root: string, rel: string, content: string): string {
  const absolute = nodePath.join(root, rel)
  fs.mkdirSync(nodePath.dirname(absolute), { recursive: true })
  fs.writeFileSync(absolute, content, 'utf8')
  return absolute
}

afterEach(() => {
  for (const dir of temporaryDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('core scanner parity regressions', () => {
  it('honours scan.include and never indexes unsupported .markdown pages', () => {
    const root = tempDir()
    write(root, 'notes/keep.md', '# Keep')
    write(root, 'drafts/skip.md', '# Skip')
    write(root, 'notes/unsupported.markdown', '# Unsupported')

    const index = scanVault(resolveOptions({
      srcDir: root,
      scan: { include: ['notes/**/*.md', '**/*.markdown'] },
    }))

    expect([...index.byRelativePath.keys()]).toEqual(['notes/keep.md'])
  })

  it('applies ordered gitignore negation instead of inverting unrelated paths', () => {
    const root = tempDir()
    write(root, '.gitignore', '*.md\n!keep.md\n/root-only.txt\n')
    const ignore = buildIgnorer(root, [], true)

    expect(ignore(nodePath.join(root, 'drop.md'))).toBe(true)
    expect(ignore(nodePath.join(root, 'keep.md'))).toBe(false)
    expect(ignore(nodePath.join(root, 'image.png'))).toBe(false)
    expect(ignore(nodePath.join(root, 'root-only.txt'))).toBe(true)
    expect(ignore(nodePath.join(root, 'nested', 'root-only.txt'))).toBe(false)
  })

  it('matches VitePress README/index routing and exact rewrites', () => {
    const root = tempDir()
    write(root, 'guide/index.md', '# Index')
    write(root, 'guide/README.md', '# Readme')
    write(root, 'old.md', '# Old')
    const options = resolveOptions({
      srcDir: root,
      cleanUrls: true,
      rewrites: { 'old.md': 'new/location.md' },
    })
    const index = scanVault(options)

    expect(index.byRelativePath.get('guide/index.md')?.url).toBe('/guide/')
    expect(index.byRelativePath.get('guide/README.md')?.url).toBe('/guide/README')
    expect(index.byRelativePath.get('old.md')?.url).toBe('/new/location')

    const nonClean = scanVault(resolveOptions({ srcDir: root, cleanUrls: false }))
    expect(nonClean.byRelativePath.get('guide/index.md')?.url).toBe('/guide/')
    expect(nonClean.byRelativePath.get('guide/README.md')?.url)
      .toBe('/guide/README.html')
  })

  it('supports named, splat and RegExp rewrite records', () => {
    const root = tempDir()
    write(root, 'guide/deep/page.md', '# Guide')
    write(root, 'legacy/old.md', '# Legacy')
    const index = scanVault(resolveOptions({
      srcDir: root,
      cleanUrls: true,
      rewrites: {
        'guide/:path*': 'manual/:path*',
        '^legacy/(.*)\\.md$': 'archive/$1.md',
      },
    }))

    expect(index.byRelativePath.get('guide/deep/page.md')?.url)
      .toBe('/manual/deep/page')
    expect(index.byRelativePath.get('legacy/old.md')?.url)
      .toBe('/archive/old')
  })

  it('uses inline heading text, Setext headings, custom slugify and duplicate suffixes', () => {
    const root = tempDir()
    write(root, 'page.md', '# **Hello** `code`\n\n# **Hello** `code`\n\nSetext title\n---\n')
    const index = scanVault(resolveOptions({
      srcDir: root,
      slugify: (text) => `x-${text.replace(/\s+/g, '_')}`,
    }))

    expect(index.byRelativePath.get('page.md')?.headings.map((heading) => heading.slug))
      .toEqual(['x-Hello_code', 'x-Hello_code-1', 'x-Setext_title'])
  })

  it('throws on strict alias conflicts', () => {
    const root = tempDir()
    write(root, 'a.md', '---\naliases: [same]\n---\n# A')
    write(root, 'b.md', '---\naliases: [same]\n---\n# B')
    expect(() => scanVault(resolveOptions({
      srcDir: root,
      onAliasConflict: 'error',
    }))).toThrow(/alias conflict.*a\.md.*b\.md/i)
  })

  it('restores URL and alias winners after HMR removal', () => {
    const root = tempDir()
    const a = write(root, 'a.md', '---\naliases: [shared]\n---\n# A')
    const b = write(root, 'b.md', '# B')
    const options = resolveOptions({
      srcDir: root,
      rewrites: { 'a.md': 'same.md', 'b.md': 'same.md' },
    })
    const index = scanVault(options)
    expect(index.byUrl.get('/same.html')?.relativePath).toBe('b.md')
    removeFile(index, b, options)
    expect(index.byUrl.get('/same.html')?.relativePath).toBe('a.md')

    write(root, 'b.md', '---\naliases: [shared]\n---\n# B')
    const aliasIndex = scanVault(resolveOptions({ srcDir: root }))
    expect(aliasIndex.byAlias.get('shared')?.relativePath).toBe('a.md')
    removeFile(aliasIndex, a, resolveOptions({ srcDir: root }))
    expect(aliasIndex.byAlias.get('shared')?.relativePath).toBe('b.md')
  })
})

describe('integration and asset regressions', () => {
  it('encodes #/? path segments and honours asset output settings', () => {
    const root = tempDir()
    const asset: AssetEntry = {
      absolutePath: nodePath.join(root, 'images', 'q#1?.png'),
      relativePath: 'images/q#1?.png',
      basename: 'q#1?.png',
      extension: 'png',
      mtime: 0,
      size: 1,
      referencedBy: new Set(),
    }
    const flat = resolveOptions({ srcDir: root, assets: { outputDir: 'media' } })
    const preserved = resolveOptions({
      srcDir: root,
      assets: { outputDir: 'media', preserveAssetPaths: true },
    })

    expect(buildPlaceholderUrl(asset, flat)).toContain('images/q%231%3F.png')
    expect(buildAssetOutputPath(asset, flat, 'abcd1234')).toBe('media/q~231~3F-abcd1234.png')
    expect(buildAssetOutputPath(asset, preserved, 'abcd1234')).toBe('media/images/q~231~3F.png')
  })

  it('emits referenced assets through the configured output directory', async () => {
    const root = tempDir()
    write(root, 'nested/pic.png', 'not-a-real-png')
    write(
      root,
      'entry-a.js',
      "import url from '/__ayn_asset__/nested/pic.png'; console.log(url)\n",
    )
    write(
      root,
      'entry-b.js',
      "import url from '/__ayn_asset__/nested/pic.png'; console.log(url)\n",
    )

    const result = await viteBuild({
      root,
      logLevel: 'silent',
      plugins: [viteAllYouNeed({
        srcDir: root,
        modules: { views: false },
        assets: { outputDir: 'media', preserveAssetPaths: true },
      })],
      build: {
        write: false,
        minify: false,
        rollupOptions: {
          input: {
            a: nodePath.join(root, 'entry-a.js'),
            b: nodePath.join(root, 'entry-b.js'),
          },
        },
      },
    })
    const builds = Array.isArray(result) ? result : [result]
    const output = builds.flatMap((build) => build.output)
    const fileNames = output.map((chunk) => chunk.fileName)
    expect(fileNames).toContain('media/nested/pic.png')
    expect(fileNames.some((fileName) => /%2f/i.test(fileName))).toBe(false)
    for (const chunk of output) {
      if (chunk.type === 'chunk') expect(chunk.code).not.toMatch(/%2f/i)
    }
  })

  it('makes deadLink:error fatal in the startup report', () => {
    expect(() => logDeadLinks({
      total: 1,
      dead: [{ source: 'a.md', target: 'missing', raw: '[[missing]]' }],
      ambiguous: [],
    }, 'error')).toThrow(/found 1 dead link.*a\.md.*missing/is)
  })

  it('does not register inline tag links when the tags view is disabled', () => {
    const root = tempDir()
    write(root, 'index.md', '# Home')
    const config = defineConfigWithAllYouNeed({
      srcDir: root,
      srcExclude: [],
    }, {
      srcDir: root,
      sidebarAuto: { mode: 'off' },
      views: { enabled: { graph: true, stats: true, tags: false } },
    })
    const md = new MarkdownIt()
    const configure = (config.markdown as { config?: (md: MarkdownIt) => void })?.config
    configure?.(md)

    expect(md.render('Text #tag')).not.toContain('class="ayn-tag"')
    expect(config.srcExclude).toContain('**/_sidebar.md')
    expect(fs.existsSync(nodePath.join(root, '_perspectives_/graph.md'))).toBe(true)
    expect(fs.existsSync(nodePath.join(root, '_perspectives_/stats.md'))).toBe(true)
    expect(fs.existsSync(nodePath.join(root, '_perspectives_/tags.md'))).toBe(false)
  })

  it('derives locale sidebar prefixes from locale links, not locale keys', () => {
    const root = tempDir()
    write(root, 'index.md', '# Home')
    write(root, 'zh/index.md', '# 中文首页')
    write(root, 'zh/guide.md', '# 指南')
    const locales = {
      root: { label: 'English', lang: 'en' },
      'zh-CN': {
        label: '简体中文',
        lang: 'zh-CN',
        link: '/zh/',
        themeConfig: {} as Record<string, unknown>,
      },
    }
    const config = defineConfigWithAllYouNeed({
      srcDir: root,
      cleanUrls: true,
      locales,
    }, {
      srcDir: root,
      modules: { views: false },
      sidebarAuto: { mode: 'force' },
    })

    const localeSidebar = locales['zh-CN'].themeConfig.sidebar
    expect(JSON.stringify(localeSidebar)).toContain('/zh/')
    expect(JSON.stringify((config.themeConfig as Record<string, unknown>).sidebar))
      .not.toContain('"/zh/')
  })
})
