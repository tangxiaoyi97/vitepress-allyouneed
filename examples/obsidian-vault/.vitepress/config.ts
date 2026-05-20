import { defineConfigWithAllYouNeed } from 'vitepress-allyouneed/vitepress'

/**
 * v0.3 示例配置:
 *   - 4 区 vault(Home / Guide / Tour / Test)
 *   - per-folder sidebar 自动生成
 *   - **i18n**:VitePress 原生 locales,zh-CN 是 root,en 在 /en/ 下;
 *     wrapper 自动给 root sidebar 排除 /en/ 子树,给 en locale 生成对应 sidebar
 */

const DEPLOY_BASE =
  process.env.DEPLOY_BASE ?? (process.env.GITHUB_ACTIONS ? '/vitepress-allyouneed/' : '/')

export default defineConfigWithAllYouNeed(
  {
    title: 'vitepress-allyouneed',
    description: 'Zero-config Obsidian vault → VitePress site',
    srcDir: '.',
    base: DEPLOY_BASE,
    cleanUrls: true,
    ignoreDeadLinks: true,
    srcExclude: ['README.md', 'HOWTO.md'],

    markdown: { math: true },

    // ── 多语言 ──────────────────────────────────────────────────
    // VitePress 看到 locales 有多个 key,自动给 nav 加语言切换器
    locales: {
      root: {
        label: '简体中文',
        lang: 'zh-CN',
        themeConfig: {
          nav: [
            { text: 'Home', link: '/', activeMatch: '^/(?!guide/|tour/|test/|en/)' },
            { text: 'Guide', link: '/guide/overview', activeMatch: '^/guide/' },
            { text: 'Tour', link: '/tour/v0.3-tour', activeMatch: '^/tour/' },
            { text: 'Test', link: '/test/header/', activeMatch: '^/test/' },
          ],
        },
      },
      en: {
        label: 'English',
        lang: 'en-US',
        link: '/en/',
        themeConfig: {
          // EN nav 故意只列 Home + Guide。
          // Tour / Test 内容(showcase + 测试笔记)还没翻译,EN 用户要看
          // 需要先用右上角语言切换器切回中文。这避免了跨 locale 跳转把
          // /tour/foo 被 EN 上下文加 prefix 成 /en/tour/foo 的 404 问题。
          nav: [
            { text: 'Home', link: '/en/', activeMatch: '^/en/(?!guide/)' },
            { text: 'Guide', link: '/en/guide/overview', activeMatch: '^/en/guide/' },
          ],
        },
      },
    },
  },
  {
    onConflict: 'shortest',
    caseSensitive: false,
    deadLink: 'warn',

    sidebarAuto: {
      mode: 'fill-if-empty',
      layout: 'per-folder',
      collapsed: false,
      sortBy: 'order-then-title',
      groupLink: 'all',
      autoFolderIndex: 'off',
      stripNumericPrefix: true,
      groupOrder: ['Guide', 'Tour', 'Test'],
      // i18n:wrapper 会自动给 root 加 excludePrefixes: ['en'],
      // 给 en locale 加 includePrefix: 'en'
    },
  },
)
