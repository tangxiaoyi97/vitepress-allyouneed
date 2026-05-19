import { defineConfigWithAllYouNeed } from 'vitepress-allyouneed/vitepress'

/**
 * 最小可运行示例配置。
 *
 * 把当前目录当作 srcDir(也就是直接把 vault 作为 VitePress 的内容根),
 * 启用 cleanUrls,其它都用默认值。
 *
 * 配套示例笔记里互相用 [[wikilink]] 引用,verify 插件正常工作。
 */
export default defineConfigWithAllYouNeed(
  {
    title: 'My Obsidian-style Vault',
    description: 'Demo of vitepress-allyouneed',
    srcDir: '.',
    cleanUrls: true,
    ignoreDeadLinks: true,

    // ⚠️ 关键:VitePress 把 README.md 和 index.md 都路由到 '/',二者同时存在
    // 会让首页 404。这里把 README.md 排除掉(它只是给读者看的运行说明,不是
    // vault 内容)。你自己的 vault 如果同时有这俩,二选一,或在这里排除。
    srcExclude: ['README.md', 'HOWTO.md'],

    themeConfig: {
      nav: [
        { text: 'Home', link: '/' },
        { text: 'Notes', link: '/note-a' },
      ],
      sidebar: [
        { text: 'Home', link: '/' },
        { text: 'Note A', link: '/note-a' },
        { text: 'Note B', link: '/note-b' },
        { text: 'Project C', link: '/projects/project-c' },
        { text: 'Embedded Note', link: '/embedded' },
        { text: '中文笔记', link: '/中文笔记' },
      ],
    },
  },
  {
    // 全部用默认即可;这里把几个常用选项写出来给你看格式
    onConflict: 'shortest',
    caseSensitive: false,
    deadLink: 'warn',
  },
)
