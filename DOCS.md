# vitepress-allyouneed — Configuration Reference

Full reference of every option, default value, and meaning. The **last section** is a
copy-pasteable cheat sheet with every default spelled out — duplicate it into your
`.vitepress/config.ts`, then prune what you don't need.

> Tip: most users want to set **almost nothing**. `defineConfigWithAllYouNeed` works
> with zero options. Reach for this doc when something doesn't behave the way you
> expect, or you want to opt into a specific feature.

---

## Top-level options (`AllYouNeedOptions`)

Passed as the second argument of `defineConfigWithAllYouNeed(vitepressConfig, allYouNeedOptions)`.

| Field | Type | Default | Notes |
|---|---|---|---|
| `srcDir` | `string` | inherits from VitePress config | Vault root. |
| `base` | `string` | inherits from VitePress config | Deploy base, e.g. `/my-site/`. |
| `cleanUrls` | `boolean` | inherits from VitePress config | If false, URLs include `.html`. |
| `caseSensitive` | `boolean` | `false` | Wikilink basename / alias / asset basename matching is case-insensitive by default. |
| `deadLink` | `'silent' \| 'warn' \| 'error'` | `'warn'` | What to do when a wikilink can't be resolved. `'error'` adds the entry to `index.warnings` (lets you fail build via VitePress). |
| `onConflict` | `'shortest' \| 'first' \| 'error'` | `'shortest'` | Basename conflicts are first narrowed to the current page's directory / longest shared path prefix (locale and section aware), then this policy is applied. `'shortest'` = fewest path segments. |
| `onAliasConflict` | `'first' \| 'error'` | `'first'` | Two files declare the same alias. |
| `slugify` | `(text: string) => string` | `@mdit-vue/shared` slugify | Heading slug function. **Must match** VitePress's `markdown.anchor.slugify` if you override either. |

### Module toggles (`modules`)

```ts
modules?: {
  wikilinks?: boolean   // default true
  embeds?:    boolean   // default true
  views?:     boolean   // default true  — Graph / Stats / Tags
  callouts?:  boolean   // default true  — Obsidian `> [!info]`
  highlight?: boolean   // default true  — Obsidian `==text==` → <mark>
  comments?:  boolean   // default true  — Obsidian `%%...%%`
  footnotes?: boolean   // default true  — Pandoc `[^1]`
  blockRefs?: boolean   // default true  — Obsidian `^block-id`
}
```

---

## Scan (`scan`)

```ts
scan?: {
  include?: string[]            // default ['**/*.md', '**/*.markdown']
  exclude?: string[]            // default ['node_modules/**', '_drafts/**', ...]
  followSymlinks?: boolean      // default false
  respectGitignore?: boolean    // default true
  assetExtensions?: string[]    // default [bmp,gif,jpeg,jpg,png,svg,webp,avif,ico,
                                //          mp4,webm,mov,m4v, mp3,wav,ogg,m4a,flac,
                                //          pdf, canvas, excalidraw]
}
```

---

## Assets (`assets`)

```ts
assets?: {
  mode?: 'auto'                  // only 'auto' supported for now
  preserveAssetPaths?: boolean   // default false (flatten + hash). true = keep relative path
  outputDir?: string             // default '_assets'
}
```

---

## Wikilinks (`wikilinks`)

```ts
wikilinks?: {
  postProcessLinkTarget?: (target: string) => string         // default: trim()
  postProcessLinkLabel?:  (label:  string) => string         // default: trim()
  allowLinkLabelFormatting?: boolean                         // default false (label = plain text)
  linkText?: 'basename' | 'fullPath'
           | ((entry: FileEntry, fallback: string) => string)  // default 'basename'
  htmlAttributes?: Record<string, string>
                 | ((ctx: PageLinkAttrsContext) => Record<string, string>)
  /**
   * v0.3.9: heading anchor matching mode.
   *   - 'exact'           — strict, matches Obsidian. Only exact text / slug.
   *   - 'leading-number'  — DEFAULT. Section-number prefix match:
   *                          [[X#7.2]] hits "## 7.2 Antike — Vorsokratiker".
   *                          Multiple matches → first one, warned like dead-link.
   *   - 'fuzzy'           — experimental. leading-number + whole-text prefix +
   *                          token match. 99% usable, corner cases polished later.
   */
  anchorMatch?: 'exact' | 'leading-number' | 'fuzzy'         // default 'leading-number'
}
```

---

## Embeds (`embeds`)

```ts
embeds?: {
  imageFileExt?: string[]                                    // default [bmp,gif,jpeg,jpg,png,svg,webp,avif,ico]
  defaultAltText?: boolean | string                          // default false
  postProcessImageTarget?: (target: string) => string        // default: trim()
  postProcessAltText?: (alt: string) => string               // default: trim()
  uriSuffix?: string                                         // default ''  — appended to <img src>
  htmlAttributes?: Record<string, string>
                 | ((ctx: ImageEmbedAttrsContext) => Record<string, string>)
  transclusionMaxDepth?: number                              // default 8
}
```

---

## Views (Graph / Stats / Tags) (`views`)

```ts
views?: {
  enabled?: {
    graph?: boolean   // default true
    stats?: boolean   // default true
    tags?:  boolean   // default true
  }
  urlPrefix?: string                              // default '_perspectives_'
                                                  //   '' = put graph.md/stats.md/tags.md at vault root
  names?: {
    graph?: string                                // default 'graph'   → URL /<prefix>/graph
    stats?: string                                // default 'stats'
    tags?:  string                                // default 'tags'
  }
  injectInto?: 'sidebar' | 'nav' | 'both' | 'off'  // default 'sidebar'
  sidebar?: 'auto' | false                         // deprecated; use injectInto
  sidebarText?: {
    group?: string                                 // default 'Perspectives'
    graph?: string                                 // default 'Graph'
    stats?: string                                 // default 'Stats'
    tags?:  string                                 // default 'Tags'
  }
  graphMaxNodes?: number                           // default 500 — above this VaultGraph shows a placeholder
  dataFileName?: string                            // default 'vault-data.json' (under <srcDir>/public/)
  parseInlineTags?: boolean                        // default true
  /**
   * v0.3.9: regex for inline #tag. **Must** capture the tag name as group 1.
   * Default: /^#([\p{L}_][\p{L}\p{N}_/-]*)/u
   */
  inlineTagPattern?: RegExp
}
```

---

## Comments (`comments`)

```ts
/**
 * v0.3.9 — Obsidian `%%comment%%` module.
 */
comments?: {
  /**
   * Render `%%comment%%` as HTML comment `<!--comment-->` in source.
   *   - true (DEFAULT) — comments survive in deployed HTML as <!-- ... -->.
   *                       Visible via view-source / DevTools. Invisible in rendered
   *                       page.
   *   - false          — fully discard at parse time (pre-v0.3.9 behavior).
   *
   * Privacy warning: anything you write in %%...%% **will appear in deployed HTML
   * source** if true. Don't put secrets / private thoughts there.
   */
  preserveAsHtmlComment?: boolean                  // default true
}
```

---

## Sidebar auto-generation (`sidebarAuto`)

Pre-v0.3 this was disabled by default. From v0.3, it's `'fill-if-empty'`.

```ts
sidebarAuto?: {
  // ── Trigger / layout ──────────────────────────────────────
  mode?: 'off' | 'fill-if-empty' | 'force'                   // default 'fill-if-empty'
  layout?: 'tree' | 'flat' | 'per-folder'                    // default 'tree'

  // ── Auto nav ──────────────────────────────────────────────
  autoNav?: boolean                                          // default false
  homeNavText?: string                                       // default 'Home'

  // v0.4.0 — autoFolderIndex was removed. Folder URLs now resolve via folderLinkOrder.
  // Migration: delete the option; if you had auto-generated index.md files with our
  // sentinel comment, they're safe to delete (they were the OLD landing pages).

  // ── Sorting / display ─────────────────────────────────────
  sortBy?: 'order-then-title' | 'title' | 'mtime-desc'       // default 'order-then-title'; folders use their dirIndex as the sorting anchor
  formatGroupTitle?: (dirname: string) => string
  formatItemTitle?:  (entry: FileEntry) => string
  collapsed?: boolean                                        // default true (each group collapsed by default)
  /**
   * Whether to strip leading "N + separator" from names. Applies to **both
   * folders (sidebar group titles) and files (sidebar item titles)** —
   * one switch controls both. There is no separate `stripFolderNumericPrefix`.
   * Default `true`. Examples (default pattern): `01-foo` → `Foo`, `1 bar` → `Bar`.
   */
  stripNumericPrefix?: boolean                               // default true
  /**
   * Regex used when stripNumericPrefix is true. Default `/^\d+[-_\s]+/`.
   *
   * Common recipes:
   *   /^\d+[-_\s]+/             (default)     `01-foo` / `02_bar` / `1 baz`
   *   /^\d+[\)\-_\s]+/                        also `1) foo`
   *   /^\(\d+\)[-_\s]*/                       `(1) foo`
   *   /^\d+(?:[-_\s]+|\.\s+)/                 also `7. Foo` (dot + REQUIRED space)
   *
   * ⚠ Don't just add `.` to the character class (`/^\d+[-_\s.]+/`):
   *   that would eat version numbers like `1.2.3-formula` → `2.3-formula`.
   *   Use the `\.\s+` alternation pattern above instead — it requires the dot
   *   to be followed by whitespace, which version numbers never have.
   */
  stripNumericPrefixPattern?: RegExp                         // default /^\d+[-_\s]+/
  /**
   * Friendlier "separator character set" — no regex needed.
   * Default `'-_\\s'` (equivalent to `[-_\s]`). Plugin builds `/^\d+[<chars>]+/`.
   *
   * Examples:
   *   '-_\\s'        (default)             matches `01-foo` / `02_bar` / `1 baz`
   *   ')\\-_\\s'                           also `1) foo`
   *
   * For "dot + space" (e.g. `7. Foo`), the character-set form CAN'T safely
   * encode "dot only if followed by space" — use `stripNumericPrefixPattern`
   * with `/^\d+(?:[-_\s]+|\.\s+)/` instead.
   *
   * If `stripNumericPrefixPattern` is set, this is ignored (Pattern wins).
   */
  stripNumericPrefixSeparators?: string                      // default '-_\\s'
  groupOrder?: string[]                                      // explicit top-level override; remaining groups follow their dirIndex sorting anchors
  foldersFirst?: boolean                                     // default false. true = Finder/Obsidian style
  maxDepth?: number                                          // default undefined (unlimited)
  exclude?: string[]                                         // default [], glob

  // ── Group link behavior ───────────────────────────────────
  /**
   * Can a group title be clicked (it's a link)?
   *   - 'all'        every group with dirIndex (DEFAULT)
   *   - 'top-level'  only top-level groups linkable; nested groups expand/collapse only
   *   - 'off'        no group is clickable
   */
  groupLink?: 'all' | 'top-level' | 'off'                    // default 'all'

  /**
   * v0.4.0: order in which folder link is resolved. The first hit wins.
   * Tokens:
   *   - 'same-name'   match `<folder>.md` inside the folder (e.g. `tour/tour.md`)
   *   - 'index'       match `index.md`
   *   - 'readme'      match `README.md`
   *   - 'first-file'  fall back to the first file (per sortBy)
   *
   * Default `['same-name', 'index', 'readme', 'first-file']` (try fancy ones first,
   * then any file). Empty `[]` = folders are never linkable.
   *
   * Applies to: auto-generated sidebar group link, auto-nav tab, user-written
   * `[[folder/]]` wikilinks.
   *
   * Empty (frontmatter-only) candidates are skipped (user opt-out signal).
   */
  folderLinkOrder?: Array<'same-name' | 'index' | 'readme' | 'first-file'>

  /**
   * @deprecated v0.4.0. Use `folderLinkOrder` instead.
   *   - 'first-file' → equivalent to default order
   *   - 'none'       → equivalent to []
   * If `folderLinkOrder` is set, this is ignored.
   */
  folderLinkFallback?: 'first-file' | 'none'

  // ── Frontmatter keys ──────────────────────────────────────
  hiddenKey?: string                                         // default 'sidebarHidden'
  titleKey?:  string                                         // default 'sidebarTitle'
  orderKey?:  string                                         // default 'order'

  // ── i18n ──────────────────────────────────────────────────
  includePrefix?: string                                     // 'en'      = only include /en/* subtree
  excludePrefixes?: string[]                                 // default [], e.g. ['en'] for root locale
}
```

### Frontmatter keys recognized in each `.md`

| Key | Type | Effect |
|---|---|---|
| `title` | `string` | page title; sidebar / nav use this if `sidebarTitle` unset |
| `sidebarTitle` | `string` | overrides sidebar text only |
| `sidebarHidden` | `boolean` | excludes this file from sidebar |
| `order` | `number` | sidebar sort weight (smaller first); on a folder dirIndex it orders that folder group |
| `sidebarCollapsed` | `boolean` | per-folder dirIndex frontmatter; controls its group's default collapsed |
| `sidebarGroup` | `string` | virtual group; this file is grouped under the named virtual group (cross-folder) |
| `aliases` | `string[]` | extra basenames a wikilink can target this file by |
| `tags` | `string[]` | tags for the Tags view |
| `created` / `updated` | `Date \| string` | DocHeader date display |

---

## `_sidebar.md` manual override

If a folder has a `_sidebar.md`, the auto-generated sidebar for that folder is **replaced** by what you write here. Two equivalent forms — pick whichever is more comfortable:

### Form 1 — frontmatter `sidebar` array (VitePress-native shape)

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
---
```

### Form 2 — markdown list

```markdown
- [[overview|🚀 Overview]]
- Docs +                              ← `+` suffix = collapsed: false
  - [[docs/install|Install]]
  - [[docs/configure|Configure]]
- Advanced -                          ← `-` suffix = collapsed: true
  - [[advanced/custom-theme|Custom theme]]
- [外链](https://example.com)
```

Rules:
- Each item starts with `-`, 2-space (or tab) indent = nesting
- `[[wikilink|text]]` and `[text](link)` both supported
- Plain text = group title (no link, but can have nested items)
- `text +` / `text -` suffix sets default `collapsed`
- Obsidian table-cell escape `\|` is treated the same as `|`

### v0.3.9 — Inline folder placeholder `{path1, path2}`

In **markdown list form**, a line can end with `{folder1, folder2, ...}` to **auto-expand** the items of those folders under the user-defined name:

```markdown
- Mechanics {Themen/Thema_08, Themen/Thema_11}
- Quantum   {Themen/Thema_09}
  - Manual extra item
  - [Another manual link](/somewhere)
- Empty group {drafts/wip}    ← if all listed folders are empty, item just has no items
```

Expansion rules:
- Each placeholder folder's **direct children .md files** → flat list at the top
- Each placeholder folder's **subfolders** → nested groups (recursive)
- Multiple folders' contents are **concatenated in order** (folder1 first, folder2 next)
- `_sidebar.md`, `index.md`, `README.md`, and `<folder>.md` (same-name dirIndex) are skipped (they're dirIndex candidates, not displayed children)
- Files with frontmatter `sidebarHidden: true` are skipped
- Items inside each folder are sorted by `sidebarAuto.sortBy` (default `order-then-title`)
- Subfolder groups use their dirIndex (`index.md`, `README.md`, or same-name page) as the sorting anchor, so `order` on that page controls the folder position
- `sidebarAuto.foldersFirst` controls whether subfolder groups come before files
- Manual children written under the line are **appended after** auto-expanded items
- Both `,` and `，` (full-width comma) work as separators; `、` also accepted

**Path resolution (v0.3.9)**:
- **Without** leading `/` → relative to **the `_sidebar.md` file's folder** (matches Obsidian / markdown intuition):

  ```
  notes/Themen/_sidebar.md
  - Mechanics {Thema_08, Thema_11}     # → notes/Themen/Thema_08, notes/Themen/Thema_11
  ```

- **With** leading `/` → relative to **`srcDir`** (absolute within vault):

  ```
  notes/anywhere/_sidebar.md
  - Far away {/compact/8 Klassische Mechanik}   # → notes/compact/8 Klassische Mechanik
  ```

`_sidebar.md` only acts when present in a folder. Otherwise the folder's sidebar comes from the in-memory auto-generation (or `materialize` if you opted in).

### v0.3.9 — Per-folder rule overrides via `_sidebar.md` frontmatter

`_sidebar.md` frontmatter can carry a `sidebarAuto:` block that **overrides** the
global `sidebarAuto` config — **only for this `_sidebar.md`'s `{folder}` expansions**.

```yaml
---
sidebarAuto:
  sortBy: title              # default 'order-then-title' (this folder ignores `order` frontmatter)
  foldersFirst: true         # this folder shows subfolder groups before files
  stripNumericPrefix: false  # don't strip numeric prefix in this folder
  collapsed: false           # nested groups in this folder default expanded
---

- {.}
- Extras {other-folder}
```

Recognized keys (all optional): `sortBy`, `collapsed`, `stripNumericPrefix`,
`stripNumericPrefixPattern`, `stripNumericPrefixSeparators`, `foldersFirst`,
`hiddenKey`, `titleKey`, `orderKey`.

### v0.3.9 — `{.}` placeholder = "current folder"

`{.}` (or `{./}`) inside `_sidebar.md` refers to **the folder that contains this
`_sidebar.md`**. Used in `materialize`'s default template (`- {.}`) and useful for
manual `_sidebar.md` files that want to embed their own folder.

### v0.3.9 — Empty-text placeholder = inline expand

If you write `- {sub}` (no text before the placeholder), the expansion **replaces
the item in place** rather than nesting under a group:

```markdown
- Manual top item
- {sub}             ← inline expanded, no wrapping group
- Other Group {other}   ← wrapped under "Other Group" group
```

---

## v0.3.9 — Materialize sidebars to per-folder `_sidebar.md`

Opt-in: `sidebarAuto.materialize: 'off' | 'top-level' | 'all'` (default `'off'`).

When enabled, the plugin writes a `_sidebar.md` file in each target folder. The
file is **fully owned by you** the moment you remove the sentinel comment.

### Why?

- **In-memory sidebar (default)**: zero files, but invisible — to tweak, you write configs
- **Per-folder `_sidebar.md` (manual)**: visible per folder, but you write everything
- **Materialize (this feature)**: plugin writes the file with a placeholder body; you
  edit if you want (rename groups, reorder, add manual items); placeholder re-resolves
  every build so new files appear automatically

### Generated template

```yaml
---
# Override sidebar rules for this folder (uncomment to use):
# sidebarAuto:
#   sortBy: title
#   collapsed: true
#   foldersFirst: false
#   stripNumericPrefix: true
#   stripNumericPrefixSeparators: "-_\\s"
#   hiddenKey: sidebarHidden
#   titleKey: sidebarTitle
#   orderKey: order
---
<!-- generated by vitepress-allyouneed/sidebar-materialize (do not edit if you want auto-refresh; remove this comment to take ownership) -->

- {.}
```

### Behavior

| Situation | Action |
|---|---|
| No `_sidebar.md` exists | Write fresh template |
| Existing `_sidebar.md` **has sentinel** | Overwrite (template upgrade) |
| Existing `_sidebar.md` **lacks sentinel** | **Skip** — assume user-owned |
| You delete the sentinel comment | Plugin stops touching the file forever |
| Folder has no `.md` content (even recursively) | Skip — don't pollute empty dirs |

### Customization patterns

```markdown
<!-- after materialization, edit freely -->

- Welcome    {README}      ← single-file group with custom name
- Tutorials  {tutorials}   ← whole tutorials/ subfolder
- API        {api/v2}      ← scoped to subfolder
- Manual extra item
- [External](https://example.com)
- Reference {.}            ← whole current folder; auto-refresh on new files
```

### Folder URLs (v0.4.0 — no more index file generation)

We no longer generate `index.md` files. **Folder URLs are resolved at link
construction time** via `folderLinkOrder`:

- Auto sidebar group link
- Auto nav tab link
- User-written `[[folder/]]` wikilink

All three resolve through the same priority list, default `['same-name', 'index',
'readme', 'first-file']`. If your folder has a `README.md`, that's the landing
page. If only `a.md` and `b.md`, sidebar/nav links go to `a.md` (per sortBy).

You can still author your own `index.md` / `README.md` / `<folder>.md` — they're
the highest-priority targets when present. We just don't auto-create one for you
anymore.

If you previously had auto-generated `index.md` files (with our sentinel comment),
they're left in place; you can delete them safely.

---

## Sidebar × autoNav: combinations and what they do

The plugin's "sidebar generation" splits into two outputs:
- **Sidebar** (left column items, set on `themeConfig.sidebar`)
- **Nav** (top tabs, set on `themeConfig.nav`)

Both are generated from your vault's folder tree. They interact via two options:

| Option | Values | Purpose |
|---|---|---|
| `sidebarAuto.layout` | `'tree'` (default) / `'flat'` (deprecated) / `'per-folder'` | shape of the sidebar |
| `sidebarAuto.autoNav` | `true` / `false` (default) | whether nav tabs are auto-generated from top-level folders |

The 6 combinations:

| layout | autoNav | What you get |
|---|---|---|
| `tree` | `false` (DEFAULT) | One sidebar with **all** folders nested as collapsible groups. No nav tabs (user provides nav, or none). Best for: small-to-medium vaults; "one big TOC" feel. |
| `tree` | `true` | Same big sidebar + auto nav tabs at top, one per top-level folder. Tabs are clickable shortcuts (resolved via `folderLinkOrder`); same sidebar always shown. |
| `flat` (deprecated) | `false` | All folders flattened to top-level groups in sidebar. Less hierarchy. Removed in v0.5. |
| `flat` (deprecated) | `true` | Same flat sidebar + auto nav tabs. Rare. Removed in v0.5. |
| `per-folder` | `false` | Each top-level folder gets its **own** sidebar, swapped as URL changes. No nav. Users navigate by URL or wikilinks; sidebar updates automatically. Suitable when vault is huge and you don't want one giant sidebar. |
| `per-folder` | `true` | **Classic docs site**: nav tabs at top switch between top-level folders, and the sidebar swaps in sync. Best UX for clearly-sectioned content. |

### How `folderLinkOrder` plugs in

Every place we need "the URL for a folder":
- Sidebar group `link` (when `groupLink` allows it)
- Nav tab `link`
- User-written `[[folder/]]` wikilink

… runs through `folderLinkOrder` resolution. Default tries `<folder>.md` first,
then `index.md`, then `README.md`, then the first file by sort. Empty `[]` =
folders never get a link (group only expand/collapse; nav tabs skipped).

### `mode` × `themeConfig.sidebar` interaction

`sidebarAuto.mode` controls whether we **fill** `themeConfig.sidebar`:
- `'off'` — don't touch user's sidebar, even if undefined
- `'fill-if-empty'` (DEFAULT) — only fill if `themeConfig.sidebar` is undefined
- `'force'` — always overwrite, even if user provided one

`autoNav` follows the **same `themeConfig.nav` rule**: only fills if undefined.
Force not currently supported for nav.

### Caveats

- **dev hot-reload**: changing the vault tree (add/remove file, edit `_sidebar.md`)
  now **auto-restarts** the dev server in v0.4.0. Edits to file content (no rename)
  still HMR normally.
- **i18n locales**: per-locale sidebars + nav are auto-generated by the wrapper.
  See "i18n" section.
- **`_sidebar.md` override**: takes precedence over auto-generation for that folder.

---

## DocHeader theme component

Visible on every page (except home / perspectives). All UI labels in English (v0.3.9+).

Frontmatter that affects it:
- `title` — H1 / banner title
- `cover` — banner image URL (relative to vault or absolute)
- `created` / `updated` — formatted as `May 21, 2026` (en-US)
- `tags` — chips with link to Tags view
- `wordsPerMinute` — reading-speed override (default 300)

`themeConfig.allyouneed?: {...}` further customizes (most users don't need this):

```ts
themeConfig: {
  allyouneed?: {
    docHeader?: {
      enabled?: boolean        // default true
      showWordCount?: boolean  // default true
      showDates?: boolean      // default true
      showTags?: boolean       // default true
      hideH1?: boolean         // default true (when title set, hide duplicate H1)
      wordsPerMinute?: number  // default 300
    }
    viewsUrlPrefix?: string    // default '_perspectives_' (must match views.urlPrefix)
    tagsViewUrl?: string       // default '/_perspectives_/tags'
  }
}
```

---

## Complete cheat sheet (copy-paste defaults)

```ts
// .vitepress/config.ts
import { defineConfigWithAllYouNeed } from 'vitepress-allyouneed/vitepress'

export default defineConfigWithAllYouNeed(
  // ── VitePress config ────────────────────────────────────────
  {
    title: 'My Vault',
    description: 'Notes',
    srcDir: '.',
    base: '/',
    cleanUrls: true,
    // (your usual VitePress options)
  },

  // ── vitepress-allyouneed options ────────────────────────────
  // Every field below shows the DEFAULT value. Delete what you don't need to override.
  {
    srcDir: undefined,                  // inherit from VitePress
    base: undefined,                    // inherit
    cleanUrls: undefined,               // inherit
    caseSensitive: false,
    deadLink: 'warn',                   // 'silent' | 'warn' | 'error'
    onConflict: 'shortest',             // 'shortest' | 'first' | 'error'
    onAliasConflict: 'first',           // 'first' | 'error'

    scan: {
      include: ['**/*.md', '**/*.markdown'],
      exclude: ['node_modules/**', '_drafts/**'],
      followSymlinks: false,
      respectGitignore: true,
      assetExtensions: [
        'bmp','gif','jpeg','jpg','png','svg','webp','avif','ico',
        'mp4','webm','mov','m4v',
        'mp3','wav','ogg','m4a','flac',
        'pdf','canvas','excalidraw',
      ],
    },

    assets: {
      mode: 'auto',
      preserveAssetPaths: false,
      outputDir: '_assets',
    },

    wikilinks: {
      postProcessLinkTarget: (t) => t.trim(),
      postProcessLinkLabel:  (l) => l.trim(),
      allowLinkLabelFormatting: false,
      linkText: 'basename',             // 'basename' | 'fullPath' | (entry, fallback) => string
      htmlAttributes: {},
      anchorMatch: 'leading-number',    // 'exact' | 'leading-number' | 'fuzzy'
    },

    embeds: {
      imageFileExt: ['bmp','gif','jpeg','jpg','png','svg','webp','avif','ico'],
      defaultAltText: false,
      postProcessImageTarget: (t) => t.trim(),
      postProcessAltText: (a) => a.trim(),
      uriSuffix: '',
      htmlAttributes: {},
      transclusionMaxDepth: 8,
    },

    views: {
      enabled: { graph: true, stats: true, tags: true },
      urlPrefix: '_perspectives_',
      names: { graph: 'graph', stats: 'stats', tags: 'tags' },
      injectInto: 'sidebar',            // 'sidebar' | 'nav' | 'both' | 'off'
      sidebarText: {
        group: 'Perspectives',
        graph: 'Graph',
        stats: 'Stats',
        tags:  'Tags',
      },
      graphMaxNodes: 500,
      dataFileName: 'vault-data.json',
      parseInlineTags: true,
      inlineTagPattern: /^#([\p{L}_][\p{L}\p{N}_/-]*)/u,
    },

    comments: {
      preserveAsHtmlComment: true,      // %% become <!-- --> in HTML source
    },

    sidebarAuto: {
      mode: 'fill-if-empty',            // 'off' | 'fill-if-empty' | 'force'
      layout: 'tree',                   // 'tree' | 'flat' | 'per-folder'
      autoNav: false,
      homeNavText: 'Home',
      // autoFolderIndex was REMOVED in v0.4.0 — folder URLs now resolve via folderLinkOrder.
      materialize: 'off',               // 'off' | 'top-level' | 'all' — opt-in: write _sidebar.md per folder
      sortBy: 'order-then-title',       // 'order-then-title' | 'title' | 'mtime-desc'
      collapsed: true,
      stripNumericPrefix: true,
      stripNumericPrefixPattern: /^\d+[-_\s]+/,
      stripNumericPrefixSeparators: '-_\\s',
      groupOrder: [],
      foldersFirst: false,
      maxDepth: undefined,
      exclude: [],
      groupLink: 'all',                 // 'all' | 'top-level' | 'off'
      folderLinkOrder: ['same-name', 'index', 'readme', 'first-file'],  // v0.4.0
      // folderLinkFallback: 'first-file',   // @deprecated v0.4.0 — use folderLinkOrder
      hiddenKey: 'sidebarHidden',
      titleKey:  'sidebarTitle',
      orderKey:  'order',
      includePrefix: undefined,
      excludePrefixes: [],
    },

    modules: {
      wikilinks: true,
      embeds: true,
      views: true,
      callouts: true,
      highlight: true,
      comments: true,
      footnotes: true,
      blockRefs: true,
    },
  },
)
```

---

## Migration notes

### v0.3.9 → v0.4.0

**Breaking-ish changes** (all softened with deprecation warnings, not hard errors):

- **`sidebarAuto.autoFolderIndex` removed**. The whole "auto-generate `index.md`
  in each folder" feature is gone. Folder URLs (`/foo/`) now have no auto-generated
  landing page — instead the **sidebar / nav / wikilink resolution** all skip
  through `folderLinkOrder` to find a real file to navigate to. Migration:
  1. Delete the option from your config (warning fires if you don't).
  2. If you had generated `index.md` files (with `<!-- generated by vitepress-allyouneed/folder-index -->` sentinel), they're left alone — delete manually if no longer wanted.
  3. If you want a folder landing page, **write `index.md` / `README.md` / `<folder>.md` yourself**. It'll be picked up automatically (it's the first thing `folderLinkOrder` looks for).
- **`folderLinkFallback` → `folderLinkOrder`**. Old field is `@deprecated`. Mappings:
  - `'first-file'` (old default) → `['same-name', 'index', 'readme', 'first-file']` (new default — same effective behavior)
  - `'none'` → `[]`
  No action needed unless you want fine-grained control (e.g., `['index']` to only ever use `index.md`).
- **`sidebarAuto.layout: 'flat'` deprecated** — fires runtime warning, removal in v0.5. Switch to `'tree'` or `'per-folder'`.
- **`views.sidebar`(`'auto'`/`false`) deprecated** — fires runtime warning, removal in v0.5. Switch to `views.injectInto: 'sidebar' | 'nav' | 'both' | 'off'`.

**Improvements**:
- Internal refactor: `humanize` / `compareEntries` / `titleForFile` collapsed into one source. No API change, no behavior change.
- **dev HMR auto-restart**: adding/removing `.md` or editing `_sidebar.md` triggers `server.restart()` so sidebar updates immediately. No more "restart manually" warnings.

### v0.3.8 → v0.3.9

- **`wikilinks.anchorMatch` default = `'leading-number'`**. If you upgraded from 0.3.7 to 0.3.8, all anchors were silently fuzzy. v0.3.9 narrows to section-number prefix. To keep 0.3.8 behavior, set `anchorMatch: 'fuzzy'`. To match Obsidian exactly, set `'exact'`.
- **`comments.preserveAsHtmlComment` default = `true`**. Your `%%notes%%` now appear in HTML source as `<!--notes-->`. To restore pre-0.3.9 behavior (fully discard), set `false`. **Don't write secrets in `%%`** if you keep this on.
- **All built-in UI strings and console messages are now in English**. DocHeader dates show as `May 21, 2026` (en-US) instead of `2026-05-21`.
- **`_sidebar.md` got a new `{folder1, folder2}` inline placeholder** — opt-in, doesn't break existing manual sidebars.

### v0.3.4 → v0.3.5

- `sidebarAuto.folderLinkFallback: 'first-file'` is the default. Group titles without `index.md` now link to the first file. Set to `'none'` to revert.

### v0.3.0 → v0.3.4

Bug-fix series. Notable behavior changes:
- Wikilink anchor with empty `index.md` (frontmatter-only) treated as opt-out for sidebar group link.
- `\|` table-cell escape in wikilinks fully respected.
