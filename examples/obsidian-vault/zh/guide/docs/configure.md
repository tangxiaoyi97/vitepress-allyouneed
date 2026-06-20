---
title: Configure
sidebarTitle: Configure
order: 2
tags: [guide, setup, config]
---

# Configure —— 全部配置参数

## 入口

```ts
// .vitepress/config.ts
import { defineConfigWithAllYouNeed } from 'vitepress-allyouneed/vitepress'

export default defineConfigWithAllYouNeed(
  vitepressConfig,    // 第一个参数:VitePress UserConfig
  allYouNeedOptions,  // 第二个参数:本插件 AllYouNeedOptions(全部可缺省)
)
```

```ts
// .vitepress/theme/index.ts
import Theme from 'vitepress-allyouneed/theme'
import 'vitepress-allyouneed/theme/style.css'
export default Theme
```

下面按字段分组列。每个字段都标了默认值。

## 顶层

```ts
{
  // 路径
  srcDir: '.',                  // vault 根目录(默认取自 VitePress)
  base: '/',                    // 站点 base path
  cleanUrls: false,             // 无 .html 后缀 URL(推荐 true)

  // 命名
  caseSensitive: false,         // wikilink/alias 匹配是否大小写敏感
  deadLink: 'warn',             // 'silent' | 'warn' | 'error'
  onConflict: 'shortest',       // 多文件同名:'shortest' | 'first' | 'error'
  onAliasConflict: 'first',     // alias 多文件:'first' | 'error'

  // 自定义 slugifier(默认走 @mdit-vue/shared,与 VitePress 内置一致)
  slugify: (text) => string,
}
```

## `scan` — 扫描器

```ts
scan: {
  include: ['**/*.md', '**/*.markdown'],   // 默认
  exclude: [],                              // 排除 glob(本插件 + VitePress.srcExclude 合并)
  followSymlinks: false,
  respectGitignore: true,
  assetExtensions: [
    // 默认列表:bmp/gif/jpeg/jpg/png/svg/webp/avif/ico
    // + mp4/webm/mov/m4v + mp3/wav/ogg/m4a/flac + pdf
    // + canvas/excalidraw(Obsidian 专属)
  ],
}
```

## `assets` — 资源管线

```ts
assets: {
  mode: 'auto',                  // v0.3 仅 'auto';未来 'public-only' / 'vite-import'
  preserveAssetPaths: false,     // true: /assets/foo.png 原路径;false: /_assets/<hash>-foo.png
  outputDir: '_assets',          // build 时 hash 模式的输出目录
}
```

## `wikilinks` — `[[]]` 模块

```ts
wikilinks: {
  postProcessLinkTarget: (t: string) => t.trim(),
  postProcessLinkLabel:  (l: string) => l.trim(),
  allowLinkLabelFormatting: false,    // label 是否允许 inline markdown(安全默认 false)
  linkText: 'basename',                // 'basename' | 'fullPath' | (entry, fallback) => string
  htmlAttributes: {},                   // 额外 <a> 属性,或函数(ctx) => attrs
}
```

回调形 `htmlAttributes` 例:
```ts
htmlAttributes: (ctx) => ({
  'data-target': ctx.target?.relativePath ?? '',
  ...(ctx.isDead ? { 'aria-disabled': 'true' } : {}),
})
```

## `embeds` — `![[]]` 模块

```ts
embeds: {
  imageFileExt: [                       // 视为图片的扩展名(剩余的走 audio/video/pdf/transclusion)
    'bmp','gif','jpeg','jpg','png','svg','webp','avif','ico'
  ],
  defaultAltText: false,                // false | true | string —— 缺省 alt 文本策略
  postProcessImageTarget: (t) => t.trim(),
  postProcessAltText:     (a) => a.trim(),
  uriSuffix: '',                         // image URL 后缀(例 '?v=1')
  transclusionMaxDepth: 8,              // 嵌套深度上限,防失控
  htmlAttributes: {},                    // <img> 额外属性,或函数
}
```

## `views` — 自动视图

```ts
views: {
  enabled: { graph: true, stats: true, tags: true },
  urlPrefix: '_perspectives_',           // 视图所在的子目录;'' 退化到 srcDir 根
  names:   { graph: 'graph', stats: 'stats', tags: 'tags' },
  sidebar: 'auto',                       // 'auto' | false
  sidebarText: {
    group: 'Perspectives',
    graph: 'Graph', stats: 'Stats', tags: 'Tags',
  },
  graphMaxNodes: 500,                    // VaultGraph 超过则降级提示
  dataFileName: 'vault-data.json',       // 写到 public/
  parseInlineTags: true,                 // 正文 #tag 也算 tag(否则只 frontmatter.tags)
}
```

## `sidebarAuto` — sidebar + nav 自动生成

完整详细参数见 **[[sidebar-auto|Sidebar 自动生成专文]]**。简列:

```ts
sidebarAuto: {
  mode: 'fill-if-empty',                 // 'off' | 'fill-if-empty' | 'force'
  layout: 'tree',                        // 'tree' | 'flat' | 'per-folder'
  autoNav: false,
  homeNavText: 'Home',
  autoFolderIndex: 'top-level',          // 'off' | 'top-level' | 'all' | object
  groupLink: 'all',                      // 'all' | 'top-level' | 'off'
  collapsed: true,
  sortBy: 'order-then-title',
  groupOrder: [],
  stripNumericPrefix: true,
  maxDepth: undefined,
  exclude: [],
  hiddenKey: 'sidebarHidden',
  titleKey: 'sidebarTitle',
  orderKey: 'order',
  formatGroupTitle: (n) => string,
  formatItemTitle: (e) => string,
}
```

## `modules` — markdown-it 模块开关

每个都可以独立关:

```ts
modules: {
  wikilinks: true,
  embeds:    true,
  views:     true,    // 自动 graph/stats/tags 视图
  callouts:  true,    // > [!type]
  highlight: true,    // ==text==
  comments:  true,    // %%text%%
  footnotes: true,    // [^id] + [^id]: text
  blockRefs: true,    // 末尾 ^id
}
```

关掉某模块的影响:
- `wikilinks: false` → `[[]]` 不渲染,普通文本
- `embeds: false` → `![[]]` 不渲染(image/audio/video/pdf/transclusion 全部失效)
- `views: false` → 不自动生成 `_perspectives_/*.md`、不写 vault-data.json
- `callouts: false` → `> [!note]` 走原版 blockquote
- `highlight: false` → `==text==` 原样输出
- `comments: false` → `%%comment%%` 原样输出
- `footnotes: false` → `[^id]` 不渲染
- `blockRefs: false` → 末尾 `^id` 字面保留

## themeConfig 内插件相关

`themeConfig.allyouneed.docHeader` 控制文档顶部 banner:

```ts
themeConfig: {
  allyouneed: {
    docHeader: {
      enabled: true,
      hideH1: true,
      showDates: true,
      showTags: true,
      showWordCount: true,
      tagsViewUrl: '/_perspectives_/tags',
      wordsPerMinute: 300,
    }
  }
}
```

## 完整示例

```ts
import { defineConfigWithAllYouNeed } from 'vitepress-allyouneed/vitepress'

export default defineConfigWithAllYouNeed(
  {
    title: 'My Vault',
    description: 'Notes 📓',
    srcDir: '.',
    cleanUrls: true,
    ignoreDeadLinks: true,
    srcExclude: ['README.md', 'HOWTO.md'],
    themeConfig: {
      nav: [
        { text: 'Home',  link: '/' },
        { text: 'Guide', link: '/guide/overview' },
        { text: 'Tour',  link: '/tour/v0.3-tour' },
      ],
      // 不写 sidebar → 让 sidebarAuto 接管
      allyouneed: {
        docHeader: { wordsPerMinute: 300 },
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
      autoFolderIndex: 'top-level',
      groupLink: 'all',
      groupOrder: ['Guide', 'Tour', 'Test'],
    },
    modules: {
      // 关掉某个用不到的模块可以让 markdown-it 跑得稍快
    },
  },
)
```

下一步: [[sidebar-auto|sidebar 自动生成完整文档]] 或 [[doc-header|DocHeader]] 或 [[theme-interop|Theme interop]]。
