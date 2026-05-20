---
layout: home

hero:
  name: vitepress-allyouneed
  text: Obsidian vault → VitePress, zero config
  tagline: One plugin for wikilinks, embeds, Obsidian syntax, views, sidebar, doc header
  actions:
    - theme: brand
      text: Get Started
      link: /en/guide/overview
    - theme: alt
      text: v0.3 Feature Tour
      link: /tour/v0.3-tour
    - theme: alt
      text: Test Playground
      link: /test/header/

features:
  - icon: 🔗
    title: Wikilinks + Embeds
    details: '`[[note]]` / `[[note#heading|alias]]` / `![[img|400]]` / `![[movie.mp4|640x360]]` / `![[note]]` transclusion. Full Obsidian link syntax.'
  - icon: 📝
    title: Native Obsidian syntax
    details: 13 callouts (+ folding, aliases, nesting), `==highlight==`, `%%comment%%`, Pandoc footnotes, `^block-ref`, body `#tag`. Plain note vaults work with zero changes.
  - icon: 🎬
    title: Auto-generated views
    details: 'VaultGraph / VaultStats / Tags — three view components auto-generated and added to the nav dropdown.'
  - icon: 📂
    title: Auto sidebar + nav
    details: 'Sidebar generated from folder structure with nested groups. `autoNav` makes top folders into nav tabs. Three layouts: tree / flat / per-folder.'
  - icon: 🖼️
    title: DocHeader banner
    details: 'Document top banner with cover/dates/tags/word-count. `frontmatter.banner` tunes position / blur / opacity / overlay.'
  - icon: 🎨
    title: Fully themable
    details: All visuals via `--ayn-*` CSS variables. Third-party themes can override by loading their CSS after ours — no fork needed.
---
