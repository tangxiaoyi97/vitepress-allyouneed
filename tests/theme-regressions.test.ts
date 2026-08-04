import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  normalizeDocTags,
  resolveCoverPath,
  toSitePath,
} from '../src/theme/doc-header.js'

describe('DocHeader frontmatter normalization', () => {
  it('normalizes leading hashes, whitespace, duplicates and non-string entries', () => {
    expect(normalizeDocTags(['#alpha', 'beta', '##alpha', 3, ''])).toEqual([
      'alpha',
      'beta',
    ])
    expect(normalizeDocTags('#one, two #three')).toEqual(['one', 'two', 'three'])
  })

  it('resolves relative public covers from the current page directory', () => {
    expect(resolveCoverPath('../assets/cover image.png', 'guides/start/page.md')).toBe(
      '/guides/assets/cover%20image.png',
    )
    expect(resolveCoverPath('./cover.png?raw#hero', 'notes/page.md')).toBe(
      '/notes/cover.png?raw#hero',
    )
    expect(resolveCoverPath('https://cdn.test/cover.png', 'notes/page.md')).toBe(
      'https://cdn.test/cover.png',
    )
  })

  it('normalizes configured internal view URLs before withBase is applied', () => {
    expect(toSitePath('_perspectives_/tags')).toBe('/_perspectives_/tags')
    expect(toSitePath('/custom/tags')).toBe('/custom/tags')
  })
})

describe('theme CSS cascade regression', () => {
  it('does not place component rules in a named layer below VitePress resets', () => {
    const root = resolve(import.meta.dirname, '..')
    const files = [
      'style.css',
      'src/theme/styles/index.css',
      'src/theme/styles/shared.css',
      'src/theme/styles/stats.css',
      'src/theme/styles/tags.css',
      'src/theme/styles/graph.css',
      'src/theme/styles/local-graph.css',
      'src/theme/styles/callouts.css',
      'src/theme/styles/doc-header.css',
    ]
    for (const file of files) {
      expect(readFileSync(resolve(root, file), 'utf8'), file).not.toContain(
        '@layer vitepress-allyouneed',
      )
    }
  })
})
