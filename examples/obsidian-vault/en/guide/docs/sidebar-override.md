---
title: Sidebar manual override (_sidebar.md)
sidebarTitle: Sidebar Override
order: 6
tags: [guide, sidebar, override]
---

# `_sidebar.md` — manual sidebar override per directory

`sidebarAuto` covers 99% cases. For the rest: drop a `_sidebar.md` in any directory to **completely replace** its sidebar.

## Trigger

A directory containing `_sidebar.md` (case-insensitive basename) → that directory's sidebar is taken **entirely** from the file. `sidebarAuto`'s scan skips it.

- The file itself doesn't appear in sidebar items (it's a config carrier)
- frontmatter `sidebar:` array wins over markdown list
- Parse failure → falls back to auto-gen + console.warn

## Two ways to write it

### 1) frontmatter `sidebar` array (VitePress native)

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
      - text: Configure
        link: /guide/docs/configure
  - text: Advanced
    collapsed: true
    items:
      - text: Custom theme
        link: /guide/advanced/custom-theme
---
```

Fields follow VitePress `SidebarItem`: `text` / `link` / `items` / `collapsed` / `base`.

### 2) Markdown list (Obsidian-friendly)

```markdown
- [[overview|Overview]]
- Docs +
  - [[docs/install|Install]]
  - [[docs/configure|Configure]]
  - [[docs/sidebar-auto|Sidebar auto-generation]]
- Advanced -
  - [[advanced/custom-theme|Custom theme]]
  - [[advanced/theme-interop|Theme interop]]
- [External link](https://example.com)
```

#### List syntax

| Form | Parsed to |
|---|---|
| `- [[note]]` | text = note's `sidebarTitle/title/H1/basename`, link = note.url |
| `- [[note\|text]]` | text = "text", link = note.url |
| `- [text](url)` | plain link (external/absolute) |
| `- plain text` | group title (no link, can have children) |
| `- text +` | same, `+` suffix = group expanded by default |
| `- text -` | same, `-` suffix = group collapsed by default |

#### Indentation

- 2 spaces = one level
- tabs equal 2 spaces
- First-line indent = level 0 (top)

#### Path resolution

`[[wikilink]]` resolves like the wikilink module:

1. Contains `/` → try absolute then relative to _sidebar.md dir
2. Otherwise try alias
3. Otherwise try basename (whole vault)
4. Not found → text only, no link (doesn't become a dead link)

## Behavior details

- Only affects that directory; subdirs follow auto rules unless they also have `_sidebar.md`
- `per-folder` layout: `_sidebar.md` replaces that top-level path's full sidebar
- `tree` / `flat`: replaces that directory's slot in the nested structure
- frontmatter array `link` field used verbatim (no resolution); markdown list does resolution
- `_sidebar.md` doesn't enter stats/graph/tags (`_` prefix excluded)

## When to use / not use

**Use when**:
- Want external links in sidebar
- Want full custom order without per-file `order`
- Want fancy titles (emojis, separators)
- Cross-folder "flat" lists

**Don't use when**:
- Reordering a few files → frontmatter `order` is faster
- Renaming one file → frontmatter `sidebarTitle` is faster
- Site-wide rules → use config `sidebarAuto.*`
