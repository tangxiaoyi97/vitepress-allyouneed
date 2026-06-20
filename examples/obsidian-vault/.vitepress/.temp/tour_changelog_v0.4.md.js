import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"v0.4","description":"","frontmatter":{"title":"v0.4","sidebarTitle":"v0.4","order":4,"tags":["changelog","v0.4"],"created":"2026-05-21T00:00:00.000Z"},"headers":[],"relativePath":"tour/changelog/v0.4.md","filePath":"tour/changelog/v0.4.md"}');
const _sfc_main = { name: "tour/changelog/v0.4.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="v0-4-—-folder-link-refactor-dev-auto-restart" tabindex="-1">v0.4 — Folder-link refactor + dev auto-restart <a class="header-anchor" href="#v0-4-—-folder-link-refactor-dev-auto-restart" aria-label="Permalink to &quot;v0.4 — Folder-link refactor + dev auto-restart&quot;">​</a></h1><h2 id="breaking" tabindex="-1">Breaking <a class="header-anchor" href="#breaking" aria-label="Permalink to &quot;Breaking&quot;">​</a></h2><ul><li><strong>Removed <code>sidebarAuto.autoFolderIndex</code></strong> — the entire feature no longer exists, and it no longer writes <code>index.md</code> files. Folder URLs are now handled directly at resolve time by <code>folderLinkOrder</code>. This field still passes typecheck in old configs, but warns once at runtime.</li></ul><h2 id="added" tabindex="-1">Added <a class="header-anchor" href="#added" aria-label="Permalink to &quot;Added&quot;">​</a></h2><ul><li><strong><code>sidebarAuto.folderLinkOrder</code></strong> (default <code>[&#39;same-name&#39;, &#39;index&#39;, &#39;readme&#39;, &#39;first-file&#39;]</code>): the resolution order for folder links, <strong>the first hit wins</strong>. It affects sidebar group links, nav tabs, and <code>[[folder/]]</code> wikilinks simultaneously. <ul><li><code>[&#39;index&#39;]</code> uses only <code>index.md</code>; <code>[]</code> = folders are never clickable; the default = the full fallback set.</li></ul></li><li><strong>dev HMR auto-restart</strong>: adding/removing a <code>.md</code> file or editing <code>_sidebar.md</code> → automatic <code>server.restart()</code>, so the sidebar / nav reflect it immediately, with no manual restart.</li><li><strong>Loosened section-number anchors</strong>: <code>[[note#13]]</code> now matches <code>## 13) Heading</code>, <code>## 13: Heading</code>, <code>## 13, Heading</code>, <code>## 13 — Heading</code>, but still <strong>does not</strong> match version-number forms like <code>## 13.5 Sub</code> (to avoid mismatches).</li></ul><h2 id="deprecated-still-works-removed-in-v0-5" tabindex="-1">Deprecated (still works, removed in v0.5) <a class="header-anchor" href="#deprecated-still-works-removed-in-v0-5" aria-label="Permalink to &quot;Deprecated (still works, removed in v0.5)&quot;">​</a></h2><ul><li><code>sidebarAuto.folderLinkFallback</code> → use <code>folderLinkOrder</code>.</li><li><code>sidebarAuto.layout: &#39;flat&#39;</code> → use <code>&#39;tree&#39;</code> or <code>&#39;per-folder&#39;</code>.</li><li><code>views.sidebar: &#39;auto&#39; | false</code> → use <code>views.injectInto</code>.</li></ul><p>For upgrade highlights, see <a href="/vitepress-allyouneed/tour/changelog/v0.5" class="wikilink" data-wikilink-target="tour/changelog/v0.5.md">v0.5 Changelog</a>.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("tour/changelog/v0.4.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const v0_4 = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  v0_4 as default
};
