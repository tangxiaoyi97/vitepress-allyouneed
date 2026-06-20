import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Stats","description":"","frontmatter":{"title":"Stats","layout":"doc","sidebar":false,"aside":false,"outline":false},"headers":[],"relativePath":"_perspectives_/stats.md","filePath":"_perspectives_/stats.md"}');
const _sfc_main = { name: "_perspectives_/stats.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_VaultStats = resolveComponent("VaultStats");
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="stats" tabindex="-1">Stats <a class="header-anchor" href="#stats" aria-label="Permalink to &quot;Stats&quot;">​</a></h1>`);
  _push(ssrRenderComponent(_component_VaultStats, null, null, _parent));
  _push(`</div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("_perspectives_/stats.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const stats = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  stats as default
};
