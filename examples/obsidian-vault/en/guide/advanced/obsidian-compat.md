---
title: Obsidian compatibility matrix
sidebarTitle: Obsidian compat
order: 4
tags: [advanced, obsidian, compat]
---

# Packaging an Obsidian vault as a VitePress site — what works?

## TL;DR

| Vault type | Status |
|---|---|
| **Plain Markdown + native Obsidian syntax** | ✅ Near-zero changes |
| **With Dataview / Templater / Tasks queries** | ❌ Those plugin syntaxes stay as code blocks |
| **Heavy canvas / excalidraw** | ⚠️ Files copied as assets, **graphs not rendered**; export first |
| **Math (`$...$` / `$$`)** | ⚠️ VitePress has `markdown.math`; user enables it |

## Detail matrix

### ✅ Fully supported

| Obsidian syntax | Renders to |
|---|---|
| `[[note]]` / `[[note\|alias]]` / `[[note#heading]]` / `[[note#heading\|alias]]` | wikilink + anchor + alias |
| `[[folder/note]]` | Path wikilink |
| frontmatter `aliases:` | Part of resolution |
| `![[image.png]]` / `![[image.png\|400]]` / `![[image.png\|alt\|400x300]]` | `<img>` with width/height |
| `![[clip.mp3]]` | `<audio controls>` |
| `![[movie.mp4\|640x360]]` | `<video controls>` |
| `![[doc.pdf\|800x600]]` | `<iframe>` |
| `![[note]]` / `![[note#heading]]` | Transclusion (full/section), cycle + depth limit |
| `> [!type]` callouts (13 + aliases + `+` `-` folding + nesting) | `<div class="callout">` |
| `==highlight==` | `<mark>` |
| `%%comment%%` | Stripped |
| `[^id]` + `[^id]: text` | Pandoc footnotes |
| Trailing `^block-id` | Adds `id="^block-id"` + `class="ayn-block-anchor"`; URL hash jump works |
| Body `#tag` | `<a class="ayn-tag">#tag</a>` linking to `/_perspectives_/tags#tag` |
| Chinese filenames (`中文笔记.md`) | URL-safe encoded; wikilink works |
| Custom frontmatter fields | Exposed to theme / DocHeader |

### ⚠️ Partial / notes

| Item | Status | Note |
|---|---|---|
| `[[note#^block-id]]` cross-page jump | ⚠️ partial | Anchor in DOM; **browser URL hash works**. But wikilink resolver doesn't yet parse `#^id` (v0.4 planned) |
| Math `$x^2$` / `$$...$$` | ⚠️ user enables | VitePress built-in `markdown.math: true` (needs `markdown-it-mathjax3` or similar) |
| `cssclasses:` frontmatter | ✅ | DocHeader Layout auto-applies to `<body>` |
| Excalidraw / Canvas (`.canvas` / `.excalidraw`) | ⚠️ | Files copied as assets; wikilink/embed doesn't render them. Export to svg/png in Obsidian first |
| `<%`/`<%+`/`<%-` (Templater) | ❌ | Preserved as-is; Templater is dynamic, VitePress is static-build |
| ` ```dataview` / ` ```dataviewjs` | ❌ | Preserved as code blocks (v0.4 roadmap: static eval) |
| Tasks plugin queries | ❌ | Same |
| Daily notes UI / Calendar | ❌ | Those are Obsidian app UI, not markdown |
| `[[]]` with `../` relative path | ❌ | Obsidian doesn't support it either; use basename or absolute path |

### ❌ Not supported

- Obsidian Sync / Publish server features (this plugin is pure static)
- Plugin runtime / 3rd-party plugins
- Dynamic queries (anything needing Obsidian internal API)
- Mod icons / inline SVG shortcodes

## Recommended migration flow

1. **Copy vault to a new dir** — don't break the original
2. **Add `.vitepress/config.ts` + `.vitepress/theme/index.ts`** — see [[install|Install]]/[[configure|Configure]]
3. `npm run dev` — startup prints **all dead links in console** (v0.3 feature), fix them
4. Pages heavy on Dataview/Templater: write markdown manually for now
5. Check frontmatter (`cover/tags/created/updated`) against [[doc-header|DocHeader]] conventions
6. `.canvas` / `.excalidraw`: export images first, then embed
7. `npm run build` → static site

## vs Obsidian Publish

| Dimension | Obsidian Publish | vitepress-allyouneed |
|---|---|---|
| Hosting | Official | Any static host (GitHub Pages / Vercel / Netlify / nginx) |
| Cost | $$ | Free (open source) |
| Custom theme | Limited | Full freedom (VitePress theme system) |
| Search | Built-in | VitePress built-in (local index) |
| Graph view | Built-in | Built-in (see [[v0.3-tour|tour]]) |
| Dataview | Partial | Not yet (v0.4 roadmap) |
| Speed | Slow (runtime render) | Fast (static gen + Vite HMR) |
