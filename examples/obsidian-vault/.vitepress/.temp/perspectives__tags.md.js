import { resolveComponent, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent } from "vue/server-renderer";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Tags","description":"","frontmatter":{"title":"Tags","layout":"doc","sidebar":false,"aside":false,"outline":false},"headers":[],"relativePath":"_perspectives_/tags.md","filePath":"_perspectives_/tags.md"}');
const _sfc_main = { name: "_perspectives_/tags.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_Tags = resolveComponent("Tags", true);
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="tags" tabindex="-1">Tags <a class="header-anchor" href="#tags" aria-label="Permalink to &quot;Tags&quot;">​</a></h1>`);
  _push(ssrRenderComponent(_component_Tags, null, null, _parent));
  _push(`</div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("_perspectives_/tags.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const tags = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  tags as default
};
