import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"v0.3","description":"","frontmatter":{"title":"v0.3","sidebarTitle":"v0.3","order":3,"tags":["changelog","v0.3"],"created":"2026-05-20T00:00:00.000Z"},"headers":[],"relativePath":"tour/changelog/v0.3.md","filePath":"tour/changelog/v0.3.md"}');
const _sfc_main = { name: "tour/changelog/v0.3.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="v0-3-—-obsidian-syntax-sidebar-nav-automation-docheader" tabindex="-1">v0.3 — Obsidian syntax + sidebar/nav automation + DocHeader <a class="header-anchor" href="#v0-3-—-obsidian-syntax-sidebar-nav-automation-docheader" aria-label="Permalink to &quot;v0.3 — Obsidian syntax + sidebar/nav automation + DocHeader&quot;">​</a></h1><h2 id="new-markdown-it-modules" tabindex="-1">New markdown-it modules <a class="header-anchor" href="#new-markdown-it-modules" aria-label="Permalink to &quot;New markdown-it modules&quot;">​</a></h2><ul><li>callouts (13 types + aliases + folding + nesting)</li><li>highlight <code>==text==</code></li><li>comments <code>%%inline%%</code> / block comments</li><li>footnotes (Pandoc style)</li><li>block-refs (<code>^id</code> render-layer anchor)</li><li>audio / video / pdf embeds (routing extension, reusing the image asset pipeline)</li></ul><h2 id="new-theme-capabilities" tabindex="-1">New theme capabilities <a class="header-anchor" href="#new-theme-capabilities" aria-label="Permalink to &quot;New theme capabilities&quot;">​</a></h2><ul><li><strong>DocHeader</strong> banner (cover / dates / tags / word-count / auto H1 hiding)</li><li><strong>Layout</strong> wrapper</li><li>brand color + flat tag pills + title divider + 2-line wrap for long titles</li></ul><h2 id="new-tooling" tabindex="-1">New tooling <a class="header-anchor" href="#new-tooling" aria-label="Permalink to &quot;New tooling&quot;">​</a></h2><ul><li><strong>sidebarAuto</strong> full suite: <ul><li><code>layout: tree / per-folder</code></li><li><code>autoNav: true</code> for nav tabs</li><li><code>groupLink: all / top-level / off</code></li><li><code>groupOrder</code> / <code>maxDepth</code> / <code>stripNumericPrefix</code></li><li>frontmatter <code>sidebarTitle / order / sidebarHidden / sidebarCollapsed / sidebarGroup</code></li></ul></li><li><strong>dirIndex priority</strong>: <code>&lt;folder&gt;.md</code> &gt; <code>index.md</code> &gt; <code>README.md</code></li><li>empty frontmatter-only dirIndex: not used as a link, but frontmatter still applies and isn&#39;t overwritten</li></ul><p>See <a href="/vitepress-allyouneed/tour/v0.5-tour" class="wikilink" data-wikilink-target="tour/v0.5-tour.md">v0.5 Tour</a> and <a href="/vitepress-allyouneed/guide/docs/sidebar-auto" class="wikilink" data-wikilink-target="guide/docs/sidebar-auto.md">Sidebar auto-generation</a>.</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("tour/changelog/v0.3.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const v0_3 = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  v0_3 as default
};
