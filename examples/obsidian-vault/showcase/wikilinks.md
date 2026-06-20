---
title: Wikilinks
sidebarTitle: Wikilinks
order: 1
tags: [showcase, wikilinks]
---

# Wikilinks

`[[...]]` double links are the core of the plugin. Each block below shows **source first, then the live render**.

## Basic links

```md
Jump to [[note-a]], or use an alias [[note-a|This is Note A]].
```

Jump to [[note-a]], or use an alias [[note-a|This is Note A]].

This renders as an `<a>` with `class="wikilink"`, and `data-wikilink-target` records the resolved relative path.

## Alias resolution (frontmatter aliases)

The frontmatter of `note-a.md` declares `aliases: [A, Alpha]`, so you can link directly by alias:

```md
Direct jump by alias: [[A]] or [[Alpha]].
```

Direct jump by alias: [[A]] or [[Alpha]].

Alias resolution **takes priority over** the basename — exactly Obsidian's behavior.

## Linking to a heading (anchor)

```md
Jump straight to a level-2 heading: [[note-a#Subheading]].
```

Jump straight to a level-2 heading: [[note-a#Subheading]].

## Path form and folder form

```md
Path form (contains `/`): [[test/wikilinks/note-b]]
Folder form (trailing `/`, lands on that folder's entry): [[showcase/]]
```

Path form (contains `/`): [[test/wikilinks/note-b]]

Folder form (trailing `/`, lands on that folder's entry): [[showcase/]]

## Dead-link visualization

A link whose target can't be found is **not** rendered as a clickable `<a href>`; instead it's marked as a red dead link (`class="wikilink--dead"`), with a tooltip on hover. This way broken links are visible at a glance on the site, instead of silently 404ing:

```md
This is a deliberately wrong link: [[this note simply does not exist]].
```

This is a deliberately wrong link: [[this note simply does not exist]].

> [!warning] Half-dead links
> If the **target exists but the anchor doesn't** (e.g. `[[note-a#a heading that doesn't exist]]`), it's marked `wikilink--unmatched-anchor` and falls back to the browser's native anchor jump, rather than failing entirely.

## The three anchor-match modes

The `anchorMatch` config option decides how `[[note#heading]]` is matched:

| Mode | Behavior |
| --- | --- |
| `exact` | Only exact matches against the heading text / slug (aligns with Obsidian) |
| `leading-number` (default) | After an exact match fails, matches by section-number prefix, e.g. `[[note#7.2]]` hits `## 7.2 Heading`. On multiple hits it takes the first and summarizes a warning at startup |
| `fuzzy` (experimental) | Additionally adds prefix + whole-word token matching; on multiple candidates it takes the shortest heading |

## Related config

```ts
{
  // anchor match mode
  wikilinks: {
    anchorMatch: 'leading-number',     // 'exact' | 'leading-number' | 'fuzzy'
    linkText: 'basename',              // default label:'basename' | 'fullPath' | function
    allowLinkLabelFormatting: false,   // when true, Markdown is allowed inside aliases
  },
  // same-name file conflicts
  onConflict: 'shortest',              // 'shortest' | 'first' | 'error'
  caseSensitive: false,
  // dead-link handling
  deadLink: 'warn',                    // 'silent' | 'warn' | 'error'
}
```

For full details, see the [[configure|configuration docs]]. Next up: [[transclusion|Embeds & Media]] →
