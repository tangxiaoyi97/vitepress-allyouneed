---
title: Sidebar auto-generation
sidebarTitle: Sidebar Auto
order: 3
tags: [guide, sidebar, nav]
---

# Sidebar auto-generation

`sidebarAuto` is a single options bag that auto-generates **nav + sidebar + folder index files** from your vault structure. Every field has a sane default — most users write nothing.

## Trigger & layout

### `mode`

```ts
mode: 'fill-if-empty'   // default
mode: 'off'             // don't touch
mode: 'force'           // always overwrite themeConfig.sidebar
```

### `layout`

```ts
layout: 'tree'        // default; nested groups
layout: 'flat'        // all dirs flattened
layout: 'per-folder'  // Record<path,items> — VitePress switches per URL
```

`'per-folder'` + `autoNav: true` = "click nav tab → switch sidebar" UX.

## Auto nav tabs

```ts
autoNav: false          // default
autoNav: true           // also fill themeConfig.nav

homeNavText: 'Home'     // first nav item text
```

## Group behavior

### `groupLink`

| Value | Top-level group | Nested sub-group |
|---|---|---|
| `'all'` (default) | linked if has dirIndex | same |
| `'top-level'` | linked | **not clickable**, expand/collapse only |
| `'off'` | none clickable | none |

> Empty frontmatter-only files don't count as dirIndex content: their frontmatter applies but the group has no link.

### `collapsed`

```ts
collapsed: true         // groups default folded
collapsed: false        // groups default open
```

Overridable per-group by `sidebarCollapsed` frontmatter.

## Sorting

```ts
sortBy: 'order-then-title'   // default
sortBy: 'title'
sortBy: 'mtime-desc'
```

```ts
groupOrder: ['Tour', 'Guide']   // top-level alpha override
stripNumericPrefix: true        // 01-foo.md → "Foo"
```

## Hide / limit

```ts
exclude: ['drafts/**', 'wip-*.md']
maxDepth: 2          // depth limit (root = 0)
```

## i18n

```ts
includePrefix: 'en'         // only scan /en/ subtree (use per locale)
excludePrefixes: ['en']     // root locale: skip locale subtrees
```

VitePress auto-adds language switcher to nav if you set `themeConfig.locales` with multiple keys.

## Auto folder index

```ts
autoFolderIndex: 'top-level'  // default
autoFolderIndex: 'off'        // don't generate
autoFolderIndex: 'all'        // every non-empty dir
autoFolderIndex: { mode, exclude, stripNumericPrefix, template }   // object form
```

| Mode | Behavior |
|---|---|
| `'off'` | None generated |
| **`'top-level'`** (default) | Only **top-level** dirs (nav tab targets) |
| `'all'` | All non-empty dirs |

User files are never overwritten. Files we generated have a sentinel comment; user adding their own dirIndex auto-cleans our stale generated file.

## frontmatter side (per-file)

```yaml
---
sidebarTitle: 🚀 Quick Start    # overrides label
order: 1                         # smaller = earlier
sidebarHidden: true              # exclude from sidebar
sidebarCollapsed: false          # dirIndex only: group fold default
sidebarGroup: Customization      # virtual group across folders
---
```

Key names overridable: `hiddenKey` / `titleKey` / `orderKey`.

## Title resolution

Item title: `sidebarTitle` > `title` > first `# H1` > basename (humanized)

Group title: dirIndex's `sidebarTitle` > `title` > first H1 > dirname humanized (with `stripNumericPrefix` + `-_` to spaces + Title Case)

## dirIndex priority (`<folder>.md` wins)

Case-insensitive precedence: **`<folder>.md` > `index.md` > `README.md`**.

`tour/tour.md` is the dirIndex for `tour/` group, beating `tour/index.md`.

## Full cheatsheet

```ts
defineConfigWithAllYouNeed(
  { /* VitePress config */ },
  {
    sidebarAuto: {
      // trigger / layout
      mode: 'fill-if-empty',
      layout: 'per-folder',

      // nav + content gen
      autoNav: true,
      homeNavText: 'Home',
      autoFolderIndex: 'top-level',

      // group behavior
      groupLink: 'all',
      collapsed: true,

      // sorting
      sortBy: 'order-then-title',
      groupOrder: ['Guide', 'Tour'],
      stripNumericPrefix: true,

      // hide / limit
      exclude: ['drafts/**'],
      maxDepth: 3,

      // i18n
      includePrefix: undefined,
      excludePrefixes: [],

      // frontmatter keys
      hiddenKey: 'sidebarHidden',
      titleKey:  'sidebarTitle',
      orderKey:  'order',

      // custom hooks
      formatGroupTitle: (n) => n,
      formatItemTitle:  (e) => e.basename,
    }
  }
)
```

## Three layouts compared

| | `'tree'` (default) | `'flat'` | `'per-folder'` |
|---|---|---|---|
| Output | `SidebarItem[]` | `SidebarItem[]` | `Record<path, SidebarItem[]>` |
| Nesting | ✓ | ✗ | ✓ |
| Multi-sidebar URL switch | ✗ | ✗ | ✓ |
| With `autoNav` | yes but no switch | same | **recommended**, nav + sidebar in sync |
| Best for | most sites | shallow vaults | multi-product docs |

## Example: per-folder + autoNav + i18n

```ts
defineConfigWithAllYouNeed(
  {
    locales: {
      root: { label: '中文', lang: 'zh-CN', themeConfig: { nav: [...] } },
      en:   { label: 'English', lang: 'en-US', link: '/en/', themeConfig: { nav: [...] } }
    }
  },
  {
    sidebarAuto: {
      layout: 'per-folder',
      autoNav: true,
      groupOrder: ['Guide', 'Tour', 'Test'],
      // wrapper auto-adds excludePrefixes:['en'] to root + includePrefix:'en' to en locale
    }
  }
)
```
