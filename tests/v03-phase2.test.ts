/**
 * v0.3 phase 2 测试 —— audio/video/pdf embed + footnotes + block-refs。
 */

import { describe, expect, it, beforeAll } from 'vitest'
import nodePath from 'node:path'
import { fileURLToPath } from 'node:url'
import MarkdownIt from 'markdown-it'

import { resolveOptions } from '../src/core/config-bridge.js'
import { scanVault } from '../src/core/vault/index.js'
import allYouNeed from '../src/markdown-it.js'
import type {
  AllYouNeedEnv,
  ResolvedOptions,
  VaultIndex,
} from '../src/core/types.js'

const here = nodePath.dirname(fileURLToPath(import.meta.url))
const VAULT = nodePath.join(here, 'fixtures', 'vault')

function makeMd(options: ResolvedOptions, index: VaultIndex): {
  md: MarkdownIt
  env: AllYouNeedEnv
} {
  const md = new MarkdownIt({ html: true })
  md.use(allYouNeed, options)
  return {
    md,
    env: { index, options, referencedAssets: new Set() } as AllYouNeedEnv,
  }
}

describe('Media embeds — audio/video/pdf', () => {
  let md: MarkdownIt
  let env: AllYouNeedEnv

  beforeAll(() => {
    const opts = resolveOptions({ srcDir: VAULT, cleanUrls: true })
    const idx = scanVault(opts)
    ;({ md, env } = makeMd(opts, idx))
  })

  // 注:media/clip.mp3、media/movie.mp4、media/doc.pdf 是 fixtures/vault 下的
  // 真实(占位字节)资源,所以这些用例验证的是真正的播放器/iframe 渲染路径。
  it('audio: ![[media/clip.mp3]] → <audio>', () => {
    const html = md.render('![[media/clip.mp3]]\n', env)
    expect(html).toContain('<audio')
    expect(html).toContain('class="ayn-embed ayn-embed--audio"')
    expect(html).toContain('controls')
  })

  it('video: ![[media/movie.mp4]] → <video>', () => {
    const html = md.render('![[media/movie.mp4]]\n', env)
    expect(html).toContain('<video')
    expect(html).toContain('ayn-embed--video')
    expect(html).toContain('controls')
  })

  it('video 支持尺寸: ![[media/movie.mp4|640x360]]', () => {
    const html = md.render('![[media/movie.mp4|640x360]]\n', env)
    expect(html).toContain('width="640"')
    expect(html).toContain('height="360"')
  })

  it('pdf: ![[media/doc.pdf]] → <iframe>', () => {
    const html = md.render('![[media/doc.pdf]]\n', env)
    expect(html).toContain('<iframe')
    expect(html).toContain('ayn-embed--pdf')
  })

  it('inline 混排:文字 + ![[media/clip.mp3]] + 文字', () => {
    const html = md.render('listen: ![[media/clip.mp3]] now\n', env)
    expect(html).toContain('<audio')
    expect(html).toContain('listen:')
    expect(html).toContain('now')
  })

  it('非媒体扩展名(.xyz)走 transclusion 路径(不爆)', () => {
    const html = md.render('![[ghost.xyz]]\n', env)
    expect(html).not.toContain('<audio')
    expect(html).not.toContain('<video')
    expect(html).not.toContain('<iframe')
  })

  // HOTFIX(0.5.2):缺失的 media 资源不能产出 <audio>/<video>/<iframe src="/...">。
  // 那个绝对 src 会被 Vite/Rollup 当模块 import,解析不到就硬崩整个 build。
  // 改为渲染不触发 Vite 解析的占位 <span>(deadLink='silent' 默认不告警),绝不 throw。
  it('缺失 media → 占位 <span>(不产出会崩 build 的播放器/iframe)', () => {
    const audio = md.render('![[does-not-exist.mp3]]\n', env)
    expect(audio).toContain('ayn-embed--missing')
    expect(audio).not.toContain('<audio')
    expect(audio).not.toContain('src="/')

    const video = md.render('![[does-not-exist.mp4]]\n', env)
    expect(video).toContain('ayn-embed--missing')
    expect(video).not.toContain('<video')
    expect(video).not.toContain('src="/')

    const pdf = md.render('![[does-not-exist.pdf]]\n', env)
    expect(pdf).toContain('ayn-embed--missing')
    expect(pdf).not.toContain('<iframe')
    expect(pdf).not.toContain('src="/')
  })
})

describe('Footnotes — Pandoc style', () => {
  let md: MarkdownIt
  let env: AllYouNeedEnv

  beforeAll(() => {
    const opts = resolveOptions({ srcDir: VAULT, cleanUrls: true })
    const idx = scanVault(opts)
    ;({ md, env } = makeMd(opts, idx))
  })

  it('基础 ref + def', () => {
    const html = md.render('text[^1]\n\n[^1]: this is the note\n', env)
    expect(html).toContain('class="ayn-footnote-ref"')
    expect(html).toContain('[1]')
    expect(html).toContain('class="ayn-footnotes"')
    expect(html).toContain('this is the note')
    expect(html).toContain('class="ayn-footnote-backref"')
  })

  it('多个 footnote 自增编号', () => {
    const html = md.render(
      'first[^a] and second[^b]\n\n[^a]: A\n[^b]: B\n',
      env,
    )
    expect(html).toMatch(/\[1\][\s\S]*\[2\]/)
    expect(html).toContain('A')
    expect(html).toContain('B')
  })

  it('同 id 多次引用共用编号 + 多反链', () => {
    const html = md.render(
      'one[^x] then again[^x]\n\n[^x]: only one def\n',
      env,
    )
    // 编号都是 1
    const oneCount = (html.match(/\[1\]/g) ?? []).length
    expect(oneCount).toBeGreaterThanOrEqual(2)
    // 两个 backref
    const backrefs = (html.match(/ayn-footnote-backref/g) ?? []).length
    expect(backrefs).toBe(2)
  })

  it('未定义的 ref 降级为原文', () => {
    const html = md.render('orphan[^nope]\n', env)
    expect(html).toContain('[^nope]')
    expect(html).not.toContain('ayn-footnote-ref')
  })

  it('def 中支持 inline markdown(粗体)', () => {
    const html = md.render('x[^1]\n\n[^1]: with **bold** in def\n', env)
    expect(html).toContain('<strong>bold</strong>')
  })

  it('modules.footnotes=false 时不处理', () => {
    const opts = resolveOptions({
      srcDir: VAULT,
      modules: { footnotes: false },
    })
    const idx = scanVault(opts)
    const { md: md2, env: env2 } = makeMd(opts, idx)
    const html = md2.render('x[^1]\n\n[^1]: hi\n', env2)
    expect(html).not.toContain('ayn-footnotes')
  })
})

describe('Block refs — ^id 锚点', () => {
  let md: MarkdownIt
  let env: AllYouNeedEnv

  beforeAll(() => {
    const opts = resolveOptions({ srcDir: VAULT, cleanUrls: true })
    const idx = scanVault(opts)
    ;({ md, env } = makeMd(opts, idx))
  })

  it('段落末尾 ^id 剥除并加到 <p id="^id">', () => {
    const html = md.render('this is a paragraph. ^my-block\n', env)
    expect(html).toContain('id="^my-block"')
    expect(html).toContain('this is a paragraph.')
    expect(html).not.toContain('^my-block<')
  })

  it('heading 末尾 ^id 加到 heading', () => {
    const html = md.render('# Title ^h-anchor\n', env)
    expect(html).toContain('id="^h-anchor"')
    expect(html).toContain('>Title<')
    // heading 的 anchor:VitePress 默认会再加一个 slug id,我们这个挂在
    // heading_open 上,VitePress 之后可能覆写。在裸 markdown-it 下应该保留
  })

  it('段落中间的 ^id 不识别(必须末尾)', () => {
    const html = md.render('middle ^id text continues\n', env)
    expect(html).not.toContain('id="^id"')
    expect(html).toContain('middle ^id text continues')
  })

  it('class ayn-block-anchor 也加上(scroll-margin 用)', () => {
    const html = md.render('p text ^anchor\n', env)
    expect(html).toContain('ayn-block-anchor')
  })

  it('modules.blockRefs=false 时不处理', () => {
    const opts = resolveOptions({
      srcDir: VAULT,
      modules: { blockRefs: false },
    })
    const idx = scanVault(opts)
    const { md: md2, env: env2 } = makeMd(opts, idx)
    const html = md2.render('text ^kept\n', env2)
    expect(html).toContain('^kept')
    expect(html).not.toContain('id="^kept"')
  })
})
