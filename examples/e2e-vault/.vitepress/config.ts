import { defineConfigWithAllYouNeed } from 'vitepress-allyouneed/vitepress'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const vaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export default defineConfigWithAllYouNeed(
  {
    title: 'AllYouNeed e2e vault',
    description: 'Small real-build fixture for vitepress-allyouneed',
    srcDir: vaultRoot,
    base: '/e2e/',
    cleanUrls: true,
    ignoreDeadLinks: false,
    srcExclude: ['README.md'],
    vite: {
      publicDir: resolve(vaultRoot, 'public-files'),
    },
    locales: {
      root: {
        label: 'English',
        lang: 'en-US',
        themeConfig: {
          nav: [
            { text: 'Home', link: '/' },
            { text: 'Notes', link: '/notes/' },
            { text: 'Views', link: '/views-overview' },
          ],
        },
      },
      zh: {
        label: '简体中文',
        lang: 'zh-CN',
        link: '/zh/',
        themeConfig: {
          nav: [
            { text: '首页', link: '/zh/' },
            { text: '指南', link: '/zh/指南' },
          ],
        },
      },
    },
  },
  {
    deadLink: 'error',
    onAliasConflict: 'error',
    assets: {
      outputDir: 'vault-assets',
      preserveAssetPaths: false,
    },
    comments: {
      preserveAsHtmlComment: false,
    },
    views: {
      dataFileName: 'e2e-vault-data.json',
      injectInto: 'both',
      localGraph: {
        enabled: true,
        depth: 1,
        maxNodes: 12,
        modalDepth: 2,
        modalMaxNodes: 40,
        mobile: 'button',
      },
    },
    sidebarAuto: {
      mode: 'force',
      layout: 'tree',
      collapsed: false,
      folderLinkOrder: ['index', 'same-name', 'first-file'],
    },
  },
)
