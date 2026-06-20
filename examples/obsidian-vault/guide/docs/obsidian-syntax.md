---
title: Obsidian syntax
sidebarTitle: Obsidian syntax
order: 5
tags: [guide, syntax]
---

# Obsidian syntax

Full demo on the `/tour/v0.3-tour` page; this is the cheatsheet.

## Wikilinks

| Form | Meaning |
|---|---|
| `[[note]]` | Plain link |
| `[[note\|alias]]` | Custom text |
| `[[note#heading]]` | Anchor jump |
| `[[note#heading\|alias]]` | Both |
| `[[folder/note]]` | Path form |

frontmatter `aliases:` also participates in resolution.

## Embeds

| Form | Renders |
|---|---|
| `![[img.png]]` / `![[img.png\|400]]` / `![[img.png\|alt\|400x300]]` | `<img>` |
| `![[clip.mp3]]` | `<audio controls>` |
| `![[movie.mp4\|640x360]]` | `<video controls>` |
| `![[doc.pdf\|800x900]]` | `<iframe>` |
| `![[note]]` / `![[note#heading]]` | transclusion (inline full / section) |

## Callouts

```md
> [!note] Optional title
> body
```

13 types: `note / info / tip / success / question / warning / failure / danger / bug / example / quote / abstract / todo`,plus aliases (`hint=tip`, `check=success`, `error=danger`...). Folding: `[!info]+` open by default, `[!info]-` closed. Nesting via `> > [!info]`.

## Other inline

- `==highlight==` → `<mark>`
- `%%comment%%` → stripped (not rendered)
- `[^id]` + standalone line `[^id]: text` → Pandoc footnotes
- Trailing `^block-id` → adds `id="^block-id"` to that block, URL hash jump works
- Body `#tag` → links to `/_perspectives_/tags#tag`

## Module switches

Each can be disabled independently:

```ts
{
  modules: {
    wikilinks: true,
    embeds: true,
    callouts: true,
    highlight: true,
    comments: true,
    footnotes: true,
    blockRefs: true,
    views: true,
  }
}
```
