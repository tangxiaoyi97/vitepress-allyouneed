---
title: Views
sidebarTitle: Views
order: 5
tags: [showcase, views, graph]
---

# Views

The plugin scans your entire vault, automatically generates three interactive view components, and writes a `vault-data.json` for the frontend. Below the **real components are embedded directly** — they read this very site's own data.

> [!tip] These are live
> The graph, stats, and tags below are real components rendered live, not screenshots. Try dragging graph nodes, or clicking a tag to filter.

## Relationship graph — VaultGraph

A D3 force-directed relationship graph: nodes are notes, edges are wikilink / transclusion relationships. It supports zooming (scroll wheel), dragging, hover-to-highlight neighbors, and click-to-navigate. When zoomed out, node names fade out automatically and emerge when zoomed in — consistent with Obsidian.

```md
<VaultGraph :max-nodes="500" />
```

<VaultGraph :max-nodes="300" />

Node size varies with in-degree (how often it's linked to); dashed lines are transclusion edges, solid lines are ordinary wikilinks. Exceeding `max-nodes` shows a downgrade notice to keep performance.

## Statistics — VaultStats

A vault overview: counts of notes / tags / links / assets, plus a recently-updated list.

```md
<VaultStats />
```

<VaultStats />

## Tag cloud — Tags

All tags (frontmatter + body `#tag`) aggregated; click to filter the notes carrying that tag.

```md
<Tags />
```

<Tags />

## How it works

1. At build time it scans the vault and generates three pages — `graph.md` / `stats.md` / `tags.md` — under `<srcDir>/<urlPrefix>/`;
2. It writes `vault-data.json` into `public/` (nodes, edges, tags, stats, all included);
3. The three components are registered globally and render by reading `vault-data.json`;
4. These view pages are automatically attached to navigation (`injectInto`: nav dropdown / sidebar group / both).

> [!info] Automatic injection
> This site attaches the views to the **Perspectives** entry in the top-right corner (default `injectInto: 'nav'`). You can also have them appended to the end of every sidebar.

## Related config

```ts
{
  views: {
    enabled: { graph: true, stats: true, tags: true },
    urlPrefix: '_perspectives_',        // directory for the view pages; '' = put at root
    graphMaxNodes: 500,                 // graph node limit
    injectInto: 'nav',                  // 'nav' | 'sidebar' | 'both' | 'off'
    parseInlineTags: true,
  },
}
```

Back to the [[index|showcase overview]], or read the [[overview|full docs]] →
