import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"","description":"","frontmatter":{"layout":"home","hero":{"name":"vitepress-allyouneed","text":"Turn your Obsidian vault into a website","tagline":"One plugin for wikilinks, embeds, Obsidian syntax, graph, sidebar, and doc header — zero config","actions":[{"theme":"brand","text":"Showcase","link":"/showcase/"},{"theme":"alt","text":"Get Started","link":"/guide/overview"},{"theme":"alt","text":"v0.5 Tour","link":"/tour/v0.5-tour"}]},"features":[{"icon":"🔗","title":"Wikilinks","details":"`[[note]]`, `[[note|alias]]`, `[[note#heading]]`, path form and folder form. Dead links are flagged visually; anchors support exact / section-number / fuzzy matching.","link":"/showcase/wikilinks","linkText":"See it"},{"icon":"📄","title":"Embeds & Media","details":"`![[note]]` full transclusion, `![[note#heading]]` section embeds; `![[img.png|400]]` images, audio, video, and PDF — all through the asset pipeline.","link":"/showcase/transclusion","linkText":"See it"},{"icon":"💬","title":"13 Callouts","details":"note / tip / warning / danger … the full Obsidian callout set, with `+`/`-` folding, custom titles, nesting, and Markdown inside titles.","link":"/showcase/callouts","linkText":"See it"},{"icon":"✍️","title":"Native syntax","details":"`==highlight==`, `%%comment%%`, Pandoc footnotes `[^1]`, `^block-id` anchors, body `#tags` — plain note vaults work with zero changes.","link":"/showcase/syntax","linkText":"See it"},{"icon":"🕸️","title":"Three views","details":"VaultGraph (D3 force-directed), VaultStats, and Tags cloud — auto-generated from your vault and added to the nav.","link":"/showcase/views","linkText":"See it"},{"icon":"📂","title":"Auto sidebar","details":"Sidebar generated from folder structure with nested groups; `_sidebar.md` for manual override; tree / per-folder layouts; sorting and folder links fully configurable.","link":"/guide/docs/sidebar-auto","linkText":"Docs"},{"icon":"🖼️","title":"Doc header banner","details":"Document top with cover image / created·updated dates / word-count reading time / tags; `banner` frontmatter tunes position, blur, opacity, overlay.","link":"/guide/docs/doc-header","linkText":"Docs"},{"icon":"🎨","title":"Fully themable","details":"All visuals via `--ayn-*` CSS variables, `@layer`-isolated so they never leak. Third-party themes override by loading after ours — no fork needed.","link":"/guide/advanced/theme-interop","linkText":"Docs"},{"icon":"🌐","title":"i18n ready","details":"Built on VitePress native locales. The plugin auto-generates a matching sidebar per language; root and sub-locales never cross-contaminate.","link":"/guide/docs/configure","linkText":"Docs"}]},"headers":[],"relativePath":"index.md","filePath":"index.md"}');
const _sfc_main = { name: "index.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  index as default
};
