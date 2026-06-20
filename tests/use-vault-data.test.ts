/**
 * v0.5 — validateVaultData 回归测试。
 *
 * 背景:之前 useVaultData 只校验 nodes/edges/stats,漏了 tags/meta。这两个字段
 * 缺失时组件会判定"加载成功",随后 Tags.vue 的 Object.entries(tags) /
 * VaultStats.vue 的 data.meta.generatedAt 在渲染期抛异常整页崩。这里锁住校验
 * 必须覆盖全部 5 个字段,防回归。
 */
import { describe, expect, it } from 'vitest'
import { validateVaultData } from '../src/theme/composables/useVaultData.js'

const good = {
  nodes: [],
  edges: [],
  stats: { totalFiles: 0 },
  tags: {},
  meta: { generatedAt: 0, pluginVersion: '0.0.0' },
}

describe('validateVaultData', () => {
  it('合法数据返回空数组(无缺失)', () => {
    expect(validateVaultData(good)).toEqual([])
  })

  it('缺 tags 被检出(此前漏检 → 渲染期崩)', () => {
    const { tags, ...rest } = good
    void tags
    expect(validateVaultData(rest)).toContain('tags')
  })

  it('缺 meta 被检出(此前漏检 → 渲染期崩)', () => {
    const { meta, ...rest } = good
    void meta
    expect(validateVaultData(rest)).toContain('meta')
  })

  it('tags 为 null 视为非法', () => {
    expect(validateVaultData({ ...good, tags: null })).toContain('tags')
  })

  it('meta 为非对象视为非法', () => {
    expect(validateVaultData({ ...good, meta: 'oops' })).toContain('meta')
  })

  it('缺 nodes/edges/stats 仍被检出(原有行为不回归)', () => {
    expect(validateVaultData({ tags: {}, meta: {} })).toEqual(
      expect.arrayContaining(['nodes', 'edges', 'stats']),
    )
  })

  it('非对象(null / 字符串 / 数字)直接判非法', () => {
    expect(validateVaultData(null).length).toBeGreaterThan(0)
    expect(validateVaultData('x').length).toBeGreaterThan(0)
    expect(validateVaultData(42).length).toBeGreaterThan(0)
  })

  it('一次报齐所有缺失字段', () => {
    expect(validateVaultData({}).sort()).toEqual(
      ['edges', 'meta', 'nodes', 'stats', 'tags'].sort(),
    )
  })
})
