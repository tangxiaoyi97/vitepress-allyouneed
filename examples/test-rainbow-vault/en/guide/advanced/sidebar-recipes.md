---
title: Sidebar recipes
sidebarTitle: Sidebar recipes
order: 2
tags: [advanced, sidebar]
---

# Sidebar recipes

Four common config combinations. Full reference: [[sidebar-auto|sidebar auto-generation]].

## A. Classic docs site (single global sidebar)

```ts
sidebarAuto: { layout: 'tree' }
```

All pages see the same sidebar, subdirs nested as collapsible sub-groups. **Default**.

## B. Shallow wiki (all dirs flat)

```ts
sidebarAuto: { layout: 'flat' }
```

No nesting; every folder is a top-level group. Great for single-layer note vaults.

## C. Multi-product docs (nav tabs + independent sidebars)

```ts
themeConfig: {
  // no nav written
},
sidebarAuto: {
  layout: 'per-folder',
  autoNav: true,
  autoFolderIndex: 'top-level',
}
```

Nav auto-generated from top folders; left sidebar swaps per URL. **This is what the example site uses.**

## D. Full auto + strict control

```ts
sidebarAuto: {
  mode: 'force',
  layout: 'tree',
  groupLink: 'top-level',
  groupOrder: ['Guide', 'Tour', 'Test'],
  stripNumericPrefix: true,
  collapsed: true,
  maxDepth: 2,
  exclude: ['drafts/**'],
}
```

Force-overrides user sidebar (`mode: 'force'`); inner groups expand-only (`groupLink: 'top-level'`); nesting capped at 2; drafts excluded.

## Typical frontmatter controls

Sort + label:
```yaml
---
sidebarTitle: 🚀 Quick Start
order: 1
---
```

Hide:
```yaml
---
sidebarHidden: true
---
```

Read-only frontmatter dirIndex (no link):
```yaml
---
# tour/tour.md with no body, frontmatter only
sidebarTitle: Tour & Showcase
sidebarCollapsed: false
---
```

This kind of "empty dirIndex" file is read for frontmatter, but the group **gets no link** and **isn't overwritten by autoFolderIndex**.
