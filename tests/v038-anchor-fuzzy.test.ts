/**
 * v0.3.8 — 柔性 heading 锚点匹配测试。
 *
 * 物理笔记 vault 大量使用"section-number-only"和"number + keyword"形式的
 * 锚点写法(如 [[X#7.2]] / [[X#11.2 Kepler]]),老 resolver 只做精确匹配
 * 导致大量"半死链":页面能打开但锚点不跳。
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import nodePath from 'node:path'
import os from 'node:os'

import { resolveOptions } from '../src/core/config-bridge.js'
import { scanVault } from '../src/core/vault/index.js'
import { resolveWikilink } from '../src/core/resolver.js'

function write(p: string, c: string): void {
  fs.mkdirSync(nodePath.dirname(p), { recursive: true })
  fs.writeFileSync(p, c, 'utf8')
}

describe('v0.3.8: 柔性 heading 锚点匹配', () => {
  let tmp: string
  beforeAll(() => {
    tmp = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'ayn-anchor-'))
    write(
      nodePath.join(tmp, 'Themen', 'Thema_07.md'),
      [
        '# Thema 7',
        '## 7.1 Allgemeines',
        '## 7.2 Antike — Vorsokratiker',
        '## 7.21 Andere Sektion',
        '## 7.3 Galileo Galilei (1564–1642) — der erste Physiker',
      ].join('\n\n'),
    )
    write(
      nodePath.join(tmp, 'Themen', 'Thema_11.md'),
      [
        '# Thema 11',
        '## 11.1 Klassische Gravitationstheorie nach Newton',
        '## 11.2 Die drei Kepler\'schen Gesetze',
        '### 1. Kepler\'sches Gesetz',
      ].join('\n\n'),
    )
    write(
      nodePath.join(tmp, 'Themen', 'Thema_04.md'),
      [
        '# Thema 4',
        '## 4.2 Cavendish-Experiment (8. Klasse, 1798)',
      ].join('\n\n'),
    )
    write(nodePath.join(tmp, 'index.md'), '# Home')
  })
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it("精确文本仍然命中(老行为)", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const r = resolveWikilink('Themen/Thema_07#7.2 Antike — Vorsokratiker', idx, opts)
    expect(r.isDead).toBe(false)
    expect(r.hasUnmatchedAnchor).toBe(false)
    // 命中的 heading 必须是 "7.2 Antike — Vorsokratiker",不是 "7.21..."
    expect(r.url).toMatch(/#.*antike/i)
  })

  it("prefix 匹配:#7.2 命中 '7.2 Antike — Vorsokratiker'", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const r = resolveWikilink('Themen/Thema_07#7.2', idx, opts)
    expect(r.isDead).toBe(false)
    expect(r.hasUnmatchedAnchor).toBe(false)
    expect(r.url).toMatch(/#.*antike/i)
  })

  it("prefix 不误匹配:#7.2 不会命中 '7.21 Andere Sektion'", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const r = resolveWikilink('Themen/Thema_07#7.2', idx, opts)
    // url 锚点应该是 7.2 对应的 slug,不是 7.21 的
    expect(r.url).not.toMatch(/7-21/)
  })

  it("token 匹配:#11.2 Kepler 命中 '11.2 Die drei Kepler\\'schen Gesetze'", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const r = resolveWikilink('Themen/Thema_11#11.2 Kepler', idx, opts)
    expect(r.isDead).toBe(false)
    expect(r.hasUnmatchedAnchor).toBe(false)
    // 命中的应该是 H2 "11.2 Die drei Kepler'schen Gesetze",不是 H3 "1. Kepler'sches Gesetz"
    expect(r.url).toMatch(/#.*kepler/i)
    expect(r.url).not.toMatch(/#1-keplersches/)
  })

  it("token 匹配:#4.2 Cavendish 命中 '4.2 Cavendish-Experiment...'", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const r = resolveWikilink('Themen/Thema_04#4.2 Cavendish', idx, opts)
    expect(r.isDead).toBe(false)
    expect(r.hasUnmatchedAnchor).toBe(false)
    expect(r.url).toMatch(/cavendish/i)
  })

  it("无对应 heading 时仍标 unmatched-anchor(老行为)", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    const r = resolveWikilink('Themen/Thema_07#完全不存在', idx, opts)
    expect(r.isDead).toBe(false)
    expect(r.hasUnmatchedAnchor).toBe(true)
  })

  it("table 内 \\| 转义 + 数字锚点:[[X#7.2\\|§7.2]] 走柔性匹配", () => {
    const opts = resolveOptions({ srcDir: tmp, cleanUrls: true })
    const idx = scanVault(opts)
    // splitWikilinkInner('Themen/Thema_07#7.2\\|§7.2') 已在 v0.3.4 处理过
    // 这里直接调 resolveWikilink 模拟拆出 target 后的样子
    const r = resolveWikilink('Themen/Thema_07#7.2', idx, opts)
    expect(r.isDead).toBe(false)
    expect(r.hasUnmatchedAnchor).toBe(false)
  })
})
