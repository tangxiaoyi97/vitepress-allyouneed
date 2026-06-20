import { defineConfigWithAllYouNeed } from 'vitepress-allyouneed/vitepress'

/**
 * 示例配置(v0.5):
 *   - 区:Home / Showcase / Guide / Tour / Test
 *   - per-folder/tree sidebar 自动生成
 *   - **i18n**:英文是 root(默认,在 `/`),中文在 `/zh/`。
 *     wrapper 自动给 root sidebar 排除 /zh/ 子树,给 zh locale 生成对应 sidebar。
 *     test/ 与 _perspectives_/ 是共享内容(不翻译),挂在 root。
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
    srcExclude: ['README.md', 'HOWTO.md', 'MIGRATE-i18n.sh'],

    markdown: { math: true },

    // ── 多语言 ──────────────────────────────────────────────────
    // 英文 = root(默认语言),中文在 /zh/。VitePress 见到多 locale 自动加
    // 右上角语言切换器。
    locales: {
      // 默认语言:英文,无路径前缀
      root: {
        label: 'English',
        lang: 'en-US',
        themeConfig: {
          nav: [
            { text: 'Home', link: '/', activeMatch: '^/(?!guide/|showcase/|tour/|test/|zh/)' },
            { text: 'Showcase', link: '/showcase/', activeMatch: '^/showcase/' },
            { text: 'Guide', link: '/guide/overview', activeMatch: '^/guide/' },
            { text: 'Tour', link: '/tour/v0.5-tour', activeMatch: '^/tour/' },
            { text: 'Test', link: '/test/header/', activeMatch: '^/test/' },
          ],
        },
      },
      // 中文:在 /zh/ 下
      zh: {
        label: '简体中文',
        lang: 'zh-CN',
        link: '/zh/',
        themeConfig: {
          nav: [
            { text: '首页', link: '/zh/', activeMatch: '^/zh/(?!guide/|showcase/|tour/)' },
            { text: '功能展示', link: '/zh/showcase/', activeMatch: '^/zh/showcase/' },
            { text: '文档', link: '/zh/guide/overview', activeMatch: '^/zh/guide/' },
            { text: '巡览', link: '/zh/tour/v0.5-tour', activeMatch: '^/zh/tour/' },
            { text: '测试', link: '/test/header/', activeMatch: '^/test/' },
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
      layout: 'tree',               // ⭐ 默认推荐:单一全局嵌套 sidebar
      collapsed: false,
      sortBy: 'order-then-title',
      groupLink: 'all',
      folderLinkOrder: ['same-name', 'index', 'readme', 'first-file'],
      stripNumericPrefix: true,
      groupOrder: ['Showcase', 'Guide', 'Tour', 'Test'],
      // i18n:wrapper 会自动给 root(英文)加 excludePrefixes: ['zh'],
      // 给 zh locale 加 includePrefix: 'zh'
    },
  },
)
