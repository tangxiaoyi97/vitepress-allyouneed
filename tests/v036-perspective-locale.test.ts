/**
 * v0.3.6 — Perspectives nav/sidebar 在 i18n root locale 注入 + nav function +
 * 空 sidebar object + perspective fallback '/' 死项的回归测试。
 */

import { describe, expect, it } from 'vitest'
import { resolveOptions } from '../src/core/config-bridge.js'
import {
  injectViewsSidebar,
  injectViewsNav,
} from '../src/core/views/sidebar-inject.js'
import type { SidebarItem } from '../src/core/sidebar-auto/index.js'

interface NavItem {
  text: string
  link?: string
  items?: NavItem[]
}

function buildOptions(): ReturnType<typeof resolveOptions> {
  return resolveOptions({
    srcDir: '/tmp/nope',
    base: '/',
    cleanUrls: true,
    views: { injectInto: 'both' },
  })
}

// ── Bug C:空 sidebar object 注入失败 ───────────────────────────

describe('Bug C: injectViewsSidebar 空 object 加 / 兜底', () => {
  it('空 object → 注入后含 / key + Perspectives 组', () => {
    const opts = buildOptions()
    const sidebar = {} as Record<string, SidebarItem[]>
    const r = injectViewsSidebar(sidebar, opts) as Record<string, SidebarItem[]>
    expect(r['/']).toBeDefined()
    expect(r['/']!.some((it) => it.text === 'Perspectives')).toBe(true)
  })

  it('部分 per-path object(只有 /guide/)→ / 也被补 Perspectives', () => {
    const opts = buildOptions()
    const sidebar = { '/guide/': [{ text: 'X', link: '/x' }] } as Record<
      string,
      SidebarItem[]
    >
    const r = injectViewsSidebar(sidebar, opts) as Record<string, SidebarItem[]>
    expect(r['/']).toBeDefined()
    expect(r['/']!.some((it) => it.text === 'Perspectives')).toBe(true)
    // /guide/ 也加了 Perspectives(原行为)
    expect(r['/guide/']!.some((it) => it.text === 'Perspectives')).toBe(true)
  })

  it('已有 / key → 追加 Perspectives 不替换', () => {
    const opts = buildOptions()
    const sidebar = { '/': [{ text: 'Existing', link: '/y' }] } as Record<
      string,
      SidebarItem[]
    >
    const r = injectViewsSidebar(sidebar, opts) as Record<string, SidebarItem[]>
    expect(r['/']!.find((it) => it.text === 'Existing')).toBeDefined()
    expect(r['/']!.find((it) => it.text === 'Perspectives')).toBeDefined()
  })
})

// ── Bug D:nav 是 function 时不丢用户 nav ───────────────────────

describe('Bug D: injectViewsNav 处理 nav function', () => {
  it('function nav → 返回函数,运行时含用户 nav + Perspectives', () => {
    const opts = buildOptions()
    const userNav = () => [{ text: 'Home', link: '/' } as NavItem]
    // injectViewsNav 公开签名是 NavConfig,这里传 fn 触发 v0.3.6 新分支
    const r = injectViewsNav(userNav as unknown as NavItem[], opts)
    expect(typeof r).toBe('function')
    const items = (r as () => NavItem[])()
    expect(items.find((it) => it.text === 'Home')).toBeDefined()
    expect(items.find((it) => it.text === 'Perspectives')).toBeDefined()
  })

  it("function nav 抛错 → 容错,只返回 [Perspectives]", () => {
    const opts = buildOptions()
    const badFn = () => {
      throw new Error('boom')
    }
    const r = injectViewsNav(badFn as unknown as NavItem[], opts)
    expect(typeof r).toBe('function')
    const items = (r as () => NavItem[])()
    // 没崩,至少有 Perspectives
    expect(items.find((it) => it.text === 'Perspectives')).toBeDefined()
  })

  it("function 重复注入不会双 Perspectives", () => {
    const opts = buildOptions()
    const userNav = () => [
      { text: 'Home', link: '/' } as NavItem,
      { text: 'Perspectives', items: [] } as NavItem,
    ]
    const r = injectViewsNav(userNav as unknown as NavItem[], opts)
    const items = (r as () => NavItem[])()
    const persCount = items.filter((it) => it.text === 'Perspectives').length
    expect(persCount).toBe(1)
  })
})

// ── Bug E:perspective fallback sidebar 不含 '/' 死项 ───────────

describe('Bug E: perspective fallback 不渲染 / 死项', () => {
  it("base 是子路径时,fallback sidebar 不含标题为 / 的项", () => {
    const opts = resolveOptions({
      srcDir: '/tmp/nope',
      base: '/sub/',
      cleanUrls: true,
      views: { injectInto: 'both' },
    })
    const sidebar = {
      '/': [{ text: 'A', link: '/a' }],
      '/guide/': [{ text: 'G', link: '/guide/a' }],
    } as Record<string, SidebarItem[]>
    const r = injectViewsSidebar(sidebar, opts) as Record<string, SidebarItem[]>
    const persSidebar = r['/_perspectives_/']
    expect(persSidebar).toBeDefined()
    // 不应该出现 text 为 '/' 或空 / 'undefined' 的项
    for (const it of persSidebar!) {
      expect(it.text).not.toBe('/')
      expect(it.text).toBeTruthy()
    }
    // 应该有 Guide 项(来自 /guide/)
    expect(persSidebar!.some((it) => it.text === 'Guide')).toBe(true)
  })
})
