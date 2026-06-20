---
title: Native Syntax
sidebarTitle: Native Syntax
order: 4
tags: [showcase, syntax]
---

# Native Syntax

All those non-standard little Markdown extensions from Obsidian are fully supported here.

## Highlight `==...==`

```md
This is ==highlighted text==, and you can even nest ==**bold + highlight**== inside.
```

This is ==highlighted text==, and you can even nest ==**bold + highlight**== inside.

This renders as `<mark>`. You can have multiple ==such== ==highlights== on the same line. An odd number of `=` treats the extras as plain text.

> [!tip] Coexisting with math formulas
> The highlight rule avoids the `==` inside MathJax inline formulas, so `$a == b$` is not mistaken for a highlight.

## Comments `%%...%%`

```md
The body shows %%this part is a comment%% and continues visibly afterward.
```

The body shows %%this part is a comment%% and continues visibly afterward.

Block-level comments (`%%` on its own line to open and close, can span multiple lines):

```md
%%
This entire block is a comment,
not shown in the body.
%%
```

%%
This entire block is a comment,
not shown in the body.
%%

> [!warning] Preserved as an HTML comment by default — don't write sensitive info
> Since v0.3.9, `preserveAsHtmlComment` **defaults to `true`**: comments don't show in the body, but they are **preserved in the deployed HTML source** as `<!-- ... -->` (visible if you view page source). So **don't put passwords or private notes** inside `%%%%`. To remove them entirely, set `comments.preserveAsHtmlComment: false`.

## Footnotes `[^1]`

Pandoc-style footnotes — reference + definition:

```md
Add a footnote reference in the body[^note]. The same footnote can be referenced multiple times[^note].

[^note]: This is the footnote definition; it appears at the bottom of the page, with a return arrow.
```

Add a footnote reference in the body[^note]. The same footnote can be referenced multiple times[^note].

[^note]: This is the footnote definition; it appears at the bottom of the page, with a return arrow.

References render as superscripts, definitions are all collected into a `<section class="ayn-footnotes">` at the very bottom of the page, numbered automatically, and multiple references share one number with multiple return arrows.

> [!info] Scope note
> Currently `[^id]` references + `[^id]: definition` (single-line definitions) are supported. Obsidian's **inline footnote** form `^[...]` is **not yet implemented**.

## Block anchors `^block-id`

Add `^id` at the end of a paragraph / heading to give that block an anchor id:

```md
This is an important sentence; give it a block anchor. ^key-point
```

This is an important sentence; give it a block anchor. ^key-point

`^key-point` is stripped out and written as this paragraph's `id`, so you can use a native browser anchor jump: `[jump to the point](#^key-point)`.

> [!warning] The `[[note#^id]]` form is not yet resolved
> Block anchors themselves work (the DOM id is written, and a native `page#^id` jump is valid). But the wikilink form `[[note#^block-id]]` is **not currently recognized by the resolver** and is treated as an unmatched anchor. To jump to a block across pages, use a plain link `[text](/path/to/note#^block-id)`.

## Tags `#tag`

A `#tag` in the body is recognized as a link that jumps to the tag view:

```md
Tag this paragraph: #showcase #syntax-demo #obsidian
```

Tag this paragraph: #showcase #syntax-demo #obsidian

It supports non-ASCII text and nested `#parent/child`. The preceding character must be the start of the line or a whitespace/boundary character, so `a#b` (like a URL fragment) is not mistaken for a tag. The `tags:` in frontmatter also feed into the tag view.

> [!info] Tags require VitePress integration
> Inline `#tag` recognition is only enabled under `defineConfigWithAllYouNeed` (the usage on this site), and is controlled by `views.parseInlineTags` (on by default).

## Related config

```ts
{
  modules: {
    highlight: true,
    comments: true,
    footnotes: true,
    blockRefs: true,
  },
  comments: {
    preserveAsHtmlComment: true,   // preserved as HTML comment by default; false = remove entirely
  },
  views: {
    parseInlineTags: true,         // recognize #tag in the body
  },
}
```

Next up: [[views|Views]] →
