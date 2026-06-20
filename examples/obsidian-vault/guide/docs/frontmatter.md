---
title: Frontmatter — complete field table
sidebarTitle: Frontmatter
order: 0
tags: [guide, frontmatter, reference]
---

# Frontmatter — complete field table

All recognized YAML keys in a `.md` file. Every field is optional.

> Sources: **AYN** = vitepress-allyouneed | **VP** = VitePress native | **Obs** = Obsidian standard | **theme** = default theme

## 1. Title / aliases / tags

| Field | Source | Type | Default | Effect |
|---|---|---|---|---|
| `title` | VP + AYN | string | basename | Page title (`<title>` + DocHeader banner + sidebar fallback) |
| `aliases` | Obs + AYN | string\|string[] | — | Wikilink aliases; `[[Alpha]]` resolves notes with `aliases: [Alpha]` |
| `tags` | Obs + AYN | string\|string[] | — | Merged with inline `#tag`; feed VaultIndex / Tags view / DocHeader pills |
| `description` | VP | string | — | Meta description (SEO) |

## 2. DocHeader / Banner

| Field | Type | Default | Effect |
|---|---|---|---|
| `cover` | string (URL or path) | — | **Triggers banner mode**; absent = Mode B (no banner, larger title) |
| `banner.x` | string | `'center'` | `background-position-x` (`center` / `50%` / `30px`) |
| `banner.y` | string | `'center'` | `background-position-y` |
| `banner.blur` | number (px) | `0` | Cover blur; >0 auto-scales 1.05 to avoid edge bleed |
| `banner.opacity` | number 0–1 | `1` | Cover opacity (creates "translucent texture" effect) |
| `banner.overlay` | number 0–1 | `0.6` | Dark overlay strength |
| `banner.text` | `'light'`\|`'dark'` | `'light'` | Banner text color; use `'dark'` for light cover |
| `created` | string\|Date | — | ISO date in DocHeader |
| `updated` | string\|Date | `page.lastUpdated` | Falls back to git lastUpdated |
| `cssclasses` | string\|string[] | — | Extra classes on `<body>` (mount/unmount safe across pages) |

See [[doc-header|DocHeader docs]].

## 3. Sidebar (per file)

| Field | Type | Default | Effect |
|---|---|---|---|
| `sidebarTitle` | string | `title` ?? H1 ?? basename | Override sidebar label (highest precedence) |
| `sidebarHidden` | boolean | `false` | Hide from sidebar entirely |
| `order` | number | `+∞` | Sort weight, smaller first; ties broken by title |
| `sidebarCollapsed` | boolean | `sidebarAuto.collapsed` | **dirIndex only**: control group default fold |
| `sidebarGroup` | string | — | **Virtual group** — pulls file into a named cross-folder group |
| `sidebar` | array | — | **`_sidebar.md` only** — full override (VitePress `SidebarItem[]`) |

Key names overridable: `sidebarAuto.titleKey/hiddenKey/orderKey`. See [[sidebar-auto|sidebar-auto]] + [[sidebar-override|sidebar-override]].

## 4. Layout / routing (VitePress native)

| Field | Type | Default | Effect |
|---|---|---|---|
| `layout` | `'doc'`\|`'home'`\|`'page'`\|`false` | `'doc'` | `'home'` = hero + features; `'page'` = no sidebar/nav; `false` = fully custom |
| `navbar` | boolean | `true` | Show nav on this page |
| `sidebar` (per-page) | boolean | `true` | Show sidebar on this page |
| `aside` | `true`\|`false`\|`'left'` | `true` | Right outline panel |
| `outline` | number\|[n,n]\|object\|`false`\|`'deep'` | `2` | TOC depth |
| `lastUpdated` | boolean | inherits | Show "last updated" line |
| `editLink` | boolean | inherits | Show "edit this page" |
| `prev` | string\|object\|`false` | auto | Prev link |
| `next` | string\|object\|`false` | auto | Next link |

### Home layout extras

| Field | Effect |
|---|---|
| `hero.name` | Big title |
| `hero.text` | Subtitle |
| `hero.tagline` | Description |
| `hero.image` | Logo (`{ src, alt }`) |
| `hero.actions[]` | CTA buttons (`{ theme, text, link }`) |
| `features[]` | Feature cards (`{ icon, title, details, link }`) |

## 5. Theme (default-theme fields, inherited)

| Field | Effect |
|---|---|
| `titleTemplate` | Browser tab title template |
| `head` | Extra `<head>` tags |

## 6. Examples

Regular doc:
```yaml
---
title: My Article
aliases: [foo, bar]
tags: [demo, draft]

cover: https://example.com/cover.jpg
banner:
  y: 35%
  overlay: 0.55
created: 2025-12-01
updated: 2026-05-20
cssclasses: [my-page]

sidebarTitle: 🚀 My Article
order: 1

outline: [2, 3]
aside: true
prev: { text: Previous, link: /prev }
next: false
---
```

Folder index (`<folder>.md` / `index.md` / `README.md`):
```yaml
---
title: Docs section
sidebarTitle: Guide
sidebarCollapsed: false
order: 1
---
```

`_sidebar.md` override (see [[sidebar-override|sidebar-override]]):
```yaml
---
sidebar:
  - text: Overview
    link: /guide/overview
  - text: Docs
    collapsed: false
    items:
      - text: Install
        link: /guide/docs/install
---
```

Home landing:
```yaml
---
layout: home
hero:
  name: My Site
  text: Subtitle
  tagline: Description
  actions:
    - theme: brand
      text: Get Started
      link: /guide/overview
features:
  - icon: 🚀
    title: Fast
    details: VitePress + Vite,instant HMR
---
```

Virtual group:
```yaml
---
title: Custom theme overrides
sidebarGroup: Customization
order: 1
---
```

Empty dirIndex (frontmatter-only,no body):
```yaml
---
# tour/tour.md with no body → group titled 'Tour' but not a link,
# only expandable/collapsible
sidebarTitle: Tour & Showcase
sidebarCollapsed: false
---
```

## 7. Precedence cheatsheet

**sidebar label**: `sidebarTitle` > `title` > first `# H1` > basename (humanized)

**banner title**: `title` > `page.title` > basename (humanized)

**created shown**: `created` > nothing

**updated shown**: `updated` > `page.lastUpdated` (git)

**dirIndex picked**: `<folder>.md` (case-insensitive) > `index.md` > `README.md`

**tags source**: `frontmatter.tags` + body `#tag` (disable inline parsing via `views.parseInlineTags: false`)

**alias matching**: case-insensitive by default; toggle via `caseSensitive: true`

## 8. Unrecognized fields

We **only read** the fields above. Custom fields (`author`, `category`, `status`...) **don't fail** and are preserved in `entry.frontmatter`; your theme/Vue components can read `useData().frontmatter.author` to use them.
