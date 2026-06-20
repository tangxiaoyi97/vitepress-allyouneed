---
title: Callouts
sidebarTitle: Callouts
order: 3
tags: [showcase, callouts]
---

# Callouts

Obsidian-style callouts: blockquotes that start with `> [!type]`. There are 13 types, each with its own icon and color scheme.

## All 13 types

```md
> [!note] Note
> A neutral note.

> [!tip] Tip
> A handy tip.
```

> [!note] Note
> A neutral note.

> [!info] Info
> An informational note.

> [!tip] Tip
> A handy tip.

> [!success] Success
> Operation succeeded.

> [!question] Question
> A question / FAQ.

> [!warning] Warning
> A warning.

> [!failure] Failure
> A failure.

> [!danger] Danger
> A dangerous operation.

> [!bug] Bug
> A known issue.

> [!example] Example
> An example.

> [!quote] Quote
> A quotation.

> [!abstract] Abstract
> Summary / TL;DR.

> [!todo] Todo
> A to-do.

## Aliases

Many types have aliases that automatically map to the standard types above:

```md
> [!hint] equivalent to tip
> [!check] equivalent to success
> [!caution] equivalent to warning
> [!error] equivalent to danger
```

> [!hint] hint → tip
> Writing `[!hint]` works exactly like `[!tip]`.

> [!error] error → danger
> Writing `[!error]` works exactly like `[!danger]`.

The full alias list: `hint/important→tip`, `check/done→success`, `help/faq→question`, `caution/attention→warning`, `fail/missing→failure`, `error→danger`, `cite→quote`, `summary/tldr→abstract`. Unknown types fall back to `note`.

## Folding

`+` is expanded by default, `-` is collapsed by default (implemented with `<details>`, so you can click to open / close):

```md
> [!tip]+ Expanded by default
> This section starts expanded.

> [!warning]- Collapsed by default
> Click the title to expand and see this section.
```

> [!tip]+ Expanded by default
> This section starts expanded.

> [!warning]- Collapsed by default
> Click the title to expand and see this section.

## Custom titles (Markdown allowed in the title)

The text after `[!type]` becomes the title; omit it to use the default title. You can also write inline Markdown in the title:

```md
> [!note] The title can have **bold**, `code` and a [[wikilinks|link]]
> Body text.
```

> [!note] The title can have **bold**, `code` and a [[wikilinks|link]]
> Body text.

## Nesting

Callouts can be nested (using multiple levels of `>`):

```md
> [!warning] Outer warning
> Outer body.
>
> > [!info] Inner info
> > Inner body.
```

> [!warning] Outer warning
> Outer body.
>
> > [!info] Inner info
> > Inner body.

## Implementation notes

Callouts are implemented by **post-rewriting the blockquote token stream** with markdown-it's core ruler, rather than a custom block rule — so ordinary blockquotes are unaffected, and nesting recurses correctly. Each type ships an inline lucide-style SVG icon, colors are driven by the `--ayn-callout-*` CSS variables, and dark mode adapts automatically.

Next up: [[syntax|Native Syntax]] →
