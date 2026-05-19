/**
 * utils 工具层测试。
 */

import { describe, expect, it } from 'vitest'
import {
  toPosix,
  stripMarkdownExt,
  basename,
  extname,
  pathDepth,
} from '../src/utils/path.js'
import { buildUrl, applyCleanUrls, encodePath } from '../src/utils/url.js'
import { escapeHtml } from '../src/utils/escape.js'

describe('utils/path', () => {
  it('toPosix 把反斜杠转正斜杠', () => {
    expect(toPosix('a\\b\\c')).toBe('a/b/c')
  })
  it('stripMarkdownExt 去掉 .md/.markdown', () => {
    expect(stripMarkdownExt('foo.md')).toBe('foo')
    expect(stripMarkdownExt('foo.markdown')).toBe('foo')
    expect(stripMarkdownExt('foo.png')).toBe('foo.png')
  })
  it('basename 不含扩展', () => {
    expect(basename('a/b/c.md', true)).toBe('c')
    expect(basename('a/b/c.md')).toBe('c.md')
  })
  it('extname 小写无点', () => {
    expect(extname('a.PNG')).toBe('png')
    expect(extname('a')).toBe('')
  })
  it('pathDepth', () => {
    expect(pathDepth('a')).toBe(1)
    expect(pathDepth('a/b/c')).toBe(3)
  })
})

describe('utils/url', () => {
  it('encodePath 保留 / 和 #', () => {
    expect(encodePath('/hello world')).toBe('/hello%20world')
    expect(encodePath('/a/b#c')).toBe('/a/b#c')
  })
  it('buildUrl 拼 base + 段', () => {
    expect(buildUrl('/', ['notes', 'a'])).toBe('/notes/a')
    expect(buildUrl('/blog/', ['notes', 'a'])).toBe('/blog/notes/a')
  })
  it('buildUrl 折叠多余 /', () => {
    expect(buildUrl('/blog/', ['/notes/', '/a/'])).toBe('/blog/notes/a')
  })
  it('buildUrl 加 anchor', () => {
    expect(buildUrl('/', ['a'], 'sec')).toBe('/a#sec')
  })
  it('applyCleanUrls', () => {
    expect(applyCleanUrls('a', true)).toBe('a')
    expect(applyCleanUrls('a', false)).toBe('a.html')
    expect(applyCleanUrls('a.html', false)).toBe('a.html')
    expect(applyCleanUrls('a/', false)).toBe('a/index.html')
  })
})

describe('utils/escape', () => {
  it('escapeHtml', () => {
    expect(escapeHtml('<a href="x">&y</a>')).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;y&lt;/a&gt;',
    )
  })
})
