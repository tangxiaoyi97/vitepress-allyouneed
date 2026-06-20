---
title: Embeds & Media
sidebarTitle: Embeds & Media
order: 2
tags: [showcase, transclusion, embed]
---

# Embeds & Media

Prefix `![[...]]` with a `!` and it changes from a "link" into an "embed". The behavior is chosen automatically by target type: note → transclusion, image / audio / video / PDF → the corresponding media tag.

## Full-page transclusion

Inline an entire note in place:

```md
![[embedded]]
```

![[embedded]]

This renders as `<div class="transclusion">`, with a "go to source" button in the top-right corner, and the content is the real HTML from recursively rendering the source note.

## Section transclusion (embed just one section)

`![[note#heading]]` embeds only the content from that heading up to the next sibling heading:

```md
![[embedded#Subheading]]
```

![[embedded#Subheading]]

> [!note] Section anchors use exact matching only
> Unlike wikilinks, the anchor of a section embed **uses exact matching only** — it does not use section-number / fuzzy modes. A section-number form like `![[note#7.2]]` does not work for section embeds.

## Inline embeds are downgraded

A transclusion produces a block-level `<div>`, and putting that inside a paragraph `<p>` is invalid HTML. So an **inline** `![[note]]` is **deliberately downgraded** into a link with a hint (this is not a bug):

```md
An ![[embedded]] in the body becomes a link; for a full-page embed, give it its own line.
```

An ![[embedded]] in the body becomes a link; for a full-page embed, give it its own line.

## Image embeds + sizing

```md
![[sample-diagram.svg]]
```

![[sample-diagram.svg]]

It supports Obsidian's sizing syntax — `|width`, `|xheight`, `|widthxheight`, as well as `|alt|widthxheight`:

```md
![[sample-diagram.svg|240]]
![[sample-diagram.svg|relationship diagram|360x150]]
```

![[sample-diagram.svg|240]]

![[sample-diagram.svg|relationship diagram|360x150]]

Images go through the plugin's asset pipeline: served on demand in dev, automatically hashed at build time — no need to manually drop them into `public/`.

## Audio / video / PDF

Media extensions are recognized automatically and rendered as the corresponding native tags (below shows only the **syntax** — this example vault ships no media files):

```md
Audio  ![[song.mp3]]            →  <audio controls>
Video  ![[clip.mp4]]            →  <video controls>
Video with size  ![[clip.mp4|640x360]]
PDF   ![[paper.pdf]]            →  <iframe> (default 100% × 600px)
PDF with size  ![[paper.pdf|800x500]]
```

Supported extensions:

- **Audio**: `mp3` `wav` `ogg` `m4a` `flac` `aac`
- **Video**: `mp4` `webm` `mov` `m4v` `avi` `mkv`
- **PDF**: `pdf`

## Cycle protection & depth limit

Transclusion has cycle detection (A embeds B, B embeds A → shows a "Cyclic transclusion" notice) and a maximum nesting depth (default 8 levels), so it won't recurse infinitely and hang the build.

## Related config

```ts
{
  embeds: {
    transclusionMaxDepth: 8,           // nesting depth limit
    imageFileExt: ['png','jpg','jpeg','gif','svg','webp','avif','bmp','ico'],
    defaultAltText: false,             // true = use filename as alt; string = fixed alt
  },
}
```

Next up: [[callouts|Callouts]] →
