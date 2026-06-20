import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"v0.2","description":"","frontmatter":{"title":"v0.2","sidebarTitle":"v0.2","order":2,"tags":["changelog","v0.2"],"created":"2026-02-15T00:00:00.000Z"},"headers":[],"relativePath":"tour/changelog/v0.2.md","filePath":"tour/changelog/v0.2.md"}');
const _sfc_main = { name: "tour/changelog/v0.2.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="v0-2-—-auto-generated-views" tabindex="-1">v0.2 — auto-generated views <a class="header-anchor" href="#v0-2-—-auto-generated-views" aria-label="Permalink to &quot;v0.2 — auto-generated views&quot;">​</a></h1><ul><li><strong>VaultGraph</strong> + <strong>VaultStats</strong> + <strong>Tags</strong> view components</li><li><code>vault-data.json</code> written to <code>public/</code> automatically</li><li>body <code>#tag</code> inline rule (links to <code>/_perspectives_/tags#tag</code>)</li><li>view URL namespace <code>_perspectives_/</code> (avoids clashing with user notes)</li><li>view group auto-appended to the sidebar</li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("tour/changelog/v0.2.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const v0_2 = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  v0_2 as default
};
