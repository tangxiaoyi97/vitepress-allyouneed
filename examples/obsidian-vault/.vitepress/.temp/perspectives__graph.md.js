import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Graph","description":"","frontmatter":{"title":"Graph","layout":"doc","sidebar":false,"aside":false,"outline":false},"headers":[],"relativePath":"_perspectives_/graph.md","filePath":"_perspectives_/graph.md"}');
const _sfc_main = { name: "_perspectives_/graph.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_VaultGraph = resolveComponent("VaultGraph");
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="graph" tabindex="-1">Graph <a class="header-anchor" href="#graph" aria-label="Permalink to &quot;Graph&quot;">​</a></h1>`);
  _push(ssrRenderComponent(_component_VaultGraph, { "max-nodes": 500 }, null, _parent));
  _push(`</div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("_perspectives_/graph.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const graph = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  graph as default
};
