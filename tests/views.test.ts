/**
 * v0.2 — 视图基础设施测试。
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import nodePath from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import MarkdownIt from 'markdown-it'

import { resolveOptions } from '../src/core/config-bridge.js'
import { scanVault } from '../src/core/vault/index.js'
import {
  generateViewMarkdown,
  VIEW_SENTINEL,
} from '../src/core/views/generate-md.js'
import {
  buildVaultData,
  writeVaultData,
} from '../src/core/views/generate-data.js'
import { injectViewsSidebar } from '../src/core/views/sidebar-inject.js'
import { registerTagsInline } from '../src/modules/tags/index.js'
import type { AllYouNeedEnv } from '../src/core/types.js'

const here = nodePath.dirname(fileURLToPath(import.meta.url))
const VAULT = nodePath.join(here, 'fixtures', 'vault')

describe('views — generate-md', () => {
  let tmpDir: string

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-test-'))
    copyDir(VAULT, tmpDir)
  })

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('生成 3 个视图 .md,内容含 sentinel', () => {
    const opts = resolveOptions({ srcDir: tmpDir, cleanUrls: true })
    const idx = scanVault(opts)
    const report = generateViewMarkdown(opts, idx)
    expect(report.written.length).toBe(3)
    for (const p of report.written) {
      expect(fs.readFileSync(p, 'utf8')).toContain(VIEW_SENTINEL)
    }
  })

  it('用户已有同名文件且无 sentinel 时跳过', () => {
    // 默认视图路径在 _perspectives_/stats.md(我们的子目录命名空间),
    // 这里手动建一个无 sentinel 的同名文件,模拟用户撞名
    const prefixDir = nodePath.join(tmpDir, '_perspectives_')
    fs.mkdirSync(prefixDir, { recursive: true })
    const conflict = nodePath.join(prefixDir, 'stats.md')
    fs.writeFileSync(conflict, '# My own stats note\n', 'utf8')

    const opts = resolveOptions({ srcDir: tmpDir, cleanUrls: true })
    const idx = scanVault(opts)
    const report = generateViewMarkdown(opts, idx)
    const skipped = report.skipped.find((s) => s.path.endsWith('stats.md'))
    expect(skipped).toBeDefined()
    expect(fs.readFileSync(conflict, 'utf8')).toContain('My own stats note')
  })

  it('视图模块关掉时不生成', () => {
    const opts = resolveOptions(
      { srcDir: tmpDir, modules: { views: false } },
      {},
    )
    const idx = scanVault(opts)
    const report = generateViewMarkdown(opts, idx)
    expect(report.written.length).toBe(0)
  })
})

describe('views — generate-data', () => {
  it('buildVaultData 含 nodes / edges / tags / stats', () => {
    const opts = resolveOptions({ srcDir: VAULT, cleanUrls: true })
    const idx = scanVault(opts)
    const data = buildVaultData(idx, opts)
    expect(data.nodes.length).toBeGreaterThan(0)
    expect(data.stats.totalFiles).toBe(idx.files.size)
    expect(data.meta.pluginVersion).toMatch(/^0\.\d/)
    // v0.2 fix:edges 应该从 content 提取出来(不再依赖 backlinks 空 Map)
    expect(data.edges.length).toBeGreaterThan(0)
  })

  it('writeVaultData 写到 public/<dataFileName>', () => {
    const tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-data-'))
    copyDir(VAULT, tmp)
    try {
      const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
      const idx = scanVault(opts)
      const r = writeVaultData(idx, opts)
      expect(fs.existsSync(r.path)).toBe(true)
      expect(r.path.endsWith('vault-data.json')).toBe(true)
      const parsed = JSON.parse(fs.readFileSync(r.path, 'utf8'))
      expect(parsed.nodes.length).toBeGreaterThan(0)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})

describe('views — sidebar-inject', () => {
  const opts = resolveOptions({ srcDir: VAULT, cleanUrls: true })

  it('array 形式 sidebar 末尾追加', () => {
    const sidebar = [{ text: 'Existing', link: '/x' }]
    const r = injectViewsSidebar(sidebar, opts) as Array<{ text?: string }>
    expect(r.length).toBe(2)
    expect(r[r.length - 1]?.text).toBe('Perspectives')
  })

  it('per-path object sidebar 每个 path 都追加', () => {
    const sidebar = {
      '/guide/': [{ text: 'Guide', link: '/guide/' }],
      '/api/': [{ text: 'API', link: '/api/' }],
    }
    const r = injectViewsSidebar(sidebar, opts) as Record<
      string,
      Array<{ text?: string }>
    >
    expect(r['/guide/']?.length).toBe(2)
    expect(r['/api/']?.length).toBe(2)
  })

  it('undefined sidebar 新建一个', () => {
    const r = injectViewsSidebar(undefined, opts) as Array<{ text?: string }>
    expect(r.length).toBe(1)
    expect(r[0]?.text).toBe('Perspectives')
  })

  it('views.sidebar=false 不动 sidebar', () => {
    const noSidebarOpts = resolveOptions({
      srcDir: VAULT,
      views: { sidebar: false },
    })
    const sidebar = [{ text: 'Existing' }]
    const r = injectViewsSidebar(sidebar, noSidebarOpts) as Array<unknown>
    expect(r.length).toBe(1)
  })
})

describe('views — inline #tag rule', () => {
  function makeMd(): { md: MarkdownIt; env: AllYouNeedEnv } {
    const opts = resolveOptions({ srcDir: VAULT, cleanUrls: true })
    const idx = scanVault(opts)
    const md = new MarkdownIt({ html: true })
    registerTagsInline(md)
    return {
      md,
      env: { index: idx, options: opts } as AllYouNeedEnv,
    }
  }

  it('识别基本 #tag', () => {
    const { md, env } = makeMd()
    const html = md.renderInline('here is #tag in text', env)
    expect(html).toContain('class="ayn-tag"')
    expect(html).toContain('>#tag<')
  })

  it('识别中文标签', () => {
    const { md, env } = makeMd()
    const html = md.renderInline('看 #中文标签 这里', env)
    expect(html).toContain('>#中文标签<')
  })

  it('识别 nested/path 标签', () => {
    const { md, env } = makeMd()
    const html = md.renderInline('see #projects/website here', env)
    expect(html).toContain('>#projects/website<')
  })

  it('URL fragment #section 不应被识别为 tag', () => {
    const { md, env } = makeMd()
    const html = md.renderInline('see https://example.com/#section here', env)
    expect(html).not.toContain('class="ayn-tag"')
  })

  it('行首 #tag 也能识别', () => {
    const { md, env } = makeMd()
    const html = md.renderInline('#tag at start', env)
    expect(html).toContain('class="ayn-tag"')
  })

  it('登记到 env.referencedTags', () => {
    const { md, env } = makeMd()
    const e = env as AllYouNeedEnv & { referencedTags?: Set<string> }
    md.renderInline('#alpha and #beta', e)
    expect(e.referencedTags?.has('alpha')).toBe(true)
    expect(e.referencedTags?.has('beta')).toBe(true)
  })

  it('数字开头不识别', () => {
    const { md, env } = makeMd()
    const html = md.renderInline('#404 page', env)
    expect(html).not.toContain('class="ayn-tag"')
  })
})

function copyDir(src: string, dst: string): void {
  fs.mkdirSync(dst, { recursive: true })
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const sp = nodePath.join(src, e.name)
    const dp = nodePath.join(dst, e.name)
    if (e.isDirectory()) copyDir(sp, dp)
    else if (e.isFile()) fs.copyFileSync(sp, dp)
  }
}
