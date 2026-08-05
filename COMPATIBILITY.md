# Compatibility

This file describes the supported integration surface for the npm package. It
is deliberately narrower than “everything Obsidian can render.”

## Runtime matrix

| Dependency | Supported range | CI / development baseline |
|---|---:|---:|
| Node.js | `>=18` | 18, 20, 22 |
| VitePress | `^1.0.0` | 1.6.4 |
| Vite | `^5.0.0 || ^6.0.0` | 6.x |
| markdown-it | `^14.0.0` | 14.1.x |
| Vue | supplied by VitePress | 3.5.x |
| markdown-it-mathjax3 | optional `^4.3.2` | install only for `markdown.math` |

The package ships ESM, CommonJS, and TypeScript declarations. The VitePress and
Vite entry points are optional integrations; the Markdown-it entry can be used
without VitePress when the caller supplies the required render environment.

## VitePress routing

- Vault pages are `.md` files because VitePress 1.x does not build `.markdown`
  pages.
- `index.md` is a directory route. `README.md` is a normal `README` route; it is
  not treated as another index page.
- `base`, `cleanUrls`, `rewrites`, locale links, and
  `markdown.anchor.slugify` are bridged by `defineConfigWithAllYouNeed`.
- `_sidebar.md` is plugin metadata and is excluded from VitePress page output.
- Custom `publicDir` and custom views data filenames are supported by the
  wrapper/Vite plugin integration.

Projects that wire `markdown-it` and Vite manually are responsible for keeping
these route settings identical on both sides.

## Obsidian-flavoured Markdown

| Capability | Status | Notes |
|---|---|---|
| Wikilinks, aliases, relative/folder links | Supported | Includes self-links and multi-level heading paths. |
| `[[note#^id]]` and `![[note#^id]]` | Supported | Paragraphs, lists, quotes/callouts, and table blocks are indexed; duplicate ids resolve to the first block. |
| Note/heading/block transclusion | Supported | Transclusion cycle guards remain enabled. |
| Images, audio, video, PDF | Supported | PDF `#page=N` and `#height=N` fragments are preserved. |
| Callouts, highlights, comments | Supported | HTML-preserved comments are not a secret-storage mechanism. |
| Footnotes | Supported | Single-line, multiline definitions, and `^[inline footnote]`. |
| Inline tags | Supported | Unicode/emoji are accepted, tags require a non-numeric character, and keys are case-insensitive/lowercased. |
| Math, Mermaid | External adapter | Use VitePress/Markdown-it integrations; Math has an optional peer dependency. |
| Canvas, Bases, search-result embeds | Not yet rendered | Kept outside 0.6.0 rather than approximated incorrectly. |
| Dataview, Templater, community plugins | Not planned in core | Plugin code and queries are never executed. |

Resolution is filesystem- and frontmatter-based; the package does not load an
Obsidian workspace or community plugins. “Supported” means covered by package
fixtures and tests, not complete behavioural equivalence with the Obsidian app.

Known boundaries:

- Dataview and DataviewJS queries are not executed.
- Canvas and Excalidraw documents are indexed as assets, not rendered as native
  interactive canvases. `.base` files and `base` code blocks are not evaluated.
- Embedded `query` blocks and the cross-vault `[[## heading]]` / `[[^^block]]`
  search shortcuts are not executed.
- Plain attachment links such as `[[Figure.png]]` are not rewritten as download
  links; the asset pipeline currently handles embeds. Obsidian's external-image
  dimension form (`![alt|100x145](url)`) is also not rewritten.
- The default media set does not yet cover every current Obsidian format:
  `.mkv` needs a scan override, while `.3gp` and `.ogv` lack dedicated renderers.
- Standard task checkboxes come from VitePress, but Obsidian's arbitrary task
  status characters and editable Reading-view toggles are not emulated.
- Frontmatter powers selected publishing fields, but typed Properties, property
  search/editing, and Obsidian Publish's `publish` / `permalink` semantics are
  not reproduced. Tag keys are lowercased instead of retaining first-seen case.
- Obsidian-specific URI schemes, commands, plugin APIs, and application state
  are outside the package scope.
- With `comments.preserveAsHtmlComment: true`, `%%comment%%` is invisible in the
  page but remains visible in deployed HTML source. Do not put secrets there.
- A browser may not support every media codec even when the asset pipeline
  correctly emits the file.

## Theme composition

`vitepress-allyouneed/theme` extends the VitePress default theme and registers
DocHeader, VaultGraph, VaultStats, Tags, and LocalGraph. `defineTheme({ extends })`
can wrap a third-party theme while preserving its base Layout. LocalGraph is
disabled by default; when enabled its preview uses deterministic SVG geometry
and the interactive D3 graph is lazy-loaded in an accessible modal.

Plugin CSS uses component-prefixed selectors and `--ayn-*` custom properties.
It intentionally uses normal, unlayered cascade rules so component styles are
not silently defeated by VitePress's unlayered reset. Import user CSS after the
package theme/styles when an override is required. Reduced motion is respected
by interactive graph transitions.

## Build and package boundaries

The npm tarball contains runtime `dist`, CSS, README, changelog, this compatibility
document, and the license. The large documentation/showcase site and generated
VitePress output are maintained separately. The package repository keeps only a
small e2e vault for real SSR/build validation.

Before upgrading, read [`CHANGELOG.md`](./CHANGELOG.md). Patch releases may fix
parity with VitePress or Obsidian where the previous behavior was a bug; new
syntax or intentionally breaking defaults are reserved for a minor/major entry.
