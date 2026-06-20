---
title: Configure
sidebarTitle: Configure
order: 2
tags: [guide, setup, config]
---

# Configure — all parameters

## Entry

```ts
// .vitepress/config.ts
import { defineConfigWithAllYouNeed } from 'vitepress-allyouneed/vitepress'

export default defineConfigWithAllYouNeed(
  vitepressConfig,    // VitePress UserConfig
  allYouNeedOptions,  // plugin options (all optional)
)
```

```ts
// .vitepress/theme/index.ts
import Theme from 'vitepress-allyouneed/theme'
import 'vitepress-allyouneed/theme/style.css'
export default Theme
```

## Top-level options

```ts
{
  srcDir: '.',              // vault root (defaults from VitePress)
  base: '/',                // site base path
  cleanUrls: false,         // recommended: true
  caseSensitive: false,     // wikilink/alias case sensitivity
  deadLink: 'warn',         // 'silent' | 'warn' | 'error'
  onConflict: 'shortest',   // duplicate basename: 'shortest' | 'first' | 'error'
  onAliasConflict: 'first', // duplicate alias: 'first' | 'error'
  slugify: (text) => string,
}
```

## `scan` — file scanner

```ts
scan: {
  include: ['**/*.md', '**/*.markdown'],
  exclude: [],                 // merged with VitePress.srcExclude
  followSymlinks: false,
  respectGitignore: true,
  assetExtensions: [/* bmp/jpg/png/svg/webp/avif/ico, mp4/webm/mov/m4v, mp3/wav/ogg/m4a/flac, pdf, canvas/excalidraw */],
}
```

## `assets` — asset pipeline

```ts
assets: {
  mode: 'auto',              // v0.3 only 'auto'
  preserveAssetPaths: false, // true: /assets/foo.png; false: /_assets/<hash>-foo.png
  outputDir: '_assets',
}
```

## `wikilinks`

```ts
wikilinks: {
  postProcessLinkTarget: (t) => t.trim(),
  postProcessLinkLabel:  (l) => l.trim(),
  allowLinkLabelFormatting: false,
  linkText: 'basename',             // 'basename' | 'fullPath' | (entry, fallback) => string
  htmlAttributes: {},               // extra <a> attrs or function
}
```

## `embeds`

```ts
embeds: {
  imageFileExt: ['bmp','gif','jpeg','jpg','png','svg','webp','avif','ico'],
  defaultAltText: false,            // false | true | string
  postProcessImageTarget: (t) => t.trim(),
  postProcessAltText:     (a) => a.trim(),
  uriSuffix: '',
  transclusionMaxDepth: 8,
  htmlAttributes: {},               // <img> extra attrs or function
}
```

## `views` — auto-generated views

```ts
views: {
  enabled:  { graph: true, stats: true, tags: true },
  urlPrefix: '_perspectives_',
  names:    { graph: 'graph', stats: 'stats', tags: 'tags' },
  injectInto: 'nav',          // 'sidebar' | 'nav' | 'both' | 'off' (default 'nav')
  sidebar: 'auto',            // legacy; use injectInto
  sidebarText: { group: 'Perspectives', graph: 'Graph', stats: 'Stats', tags: 'Tags' },
  graphMaxNodes: 500,
  dataFileName: 'vault-data.json',
  parseInlineTags: true,
}
```

## `sidebarAuto`

Full reference: [[sidebar-auto|Sidebar auto-generation]].

```ts
sidebarAuto: {
  mode: 'fill-if-empty',         // 'off' | 'fill-if-empty' | 'force'
  layout: 'tree',                // 'tree' | 'flat' | 'per-folder'
  autoNav: false,
  homeNavText: 'Home',
  autoFolderIndex: 'top-level',  // 'off' | 'top-level' | 'all' | object
  groupLink: 'all',              // 'all' | 'top-level' | 'off'
  collapsed: true,
  sortBy: 'order-then-title',    // 'order-then-title' | 'title' | 'mtime-desc'
  groupOrder: [],
  stripNumericPrefix: true,
  maxDepth: undefined,
  exclude: [],
  // i18n
  includePrefix: undefined,
  excludePrefixes: [],
  // frontmatter key overrides
  hiddenKey: 'sidebarHidden',
  titleKey:  'sidebarTitle',
  orderKey:  'order',
  formatGroupTitle: (n) => string,
  formatItemTitle:  (e) => string,
}
```

## `modules` — module switches

```ts
modules: {
  wikilinks: true,
  embeds:    true,
  views:     true,
  callouts:  true,    // > [!type]
  highlight: true,    // ==text==
  comments:  true,    // %%text%%
  footnotes: true,    // [^id] + [^id]: text
  blockRefs: true,    // trailing ^id
}
```

## themeConfig.allyouneed

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

Next: [[frontmatter|Frontmatter complete table]] / [[sidebar-auto|Sidebar auto-generation]] / [[theme-interop|Theme interop]].
