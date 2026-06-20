import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"","description":"","frontmatter":{"sidebarTitle":"Wikilinks(自定义标题)","sidebarCollapsed":false},"headers":[],"relativePath":"test/wikilinks/wikilinks.md","filePath":"test/wikilinks/wikilinks.md"}');
const _sfc_main = { name: "test/wikilinks/wikilinks.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("test/wikilinks/wikilinks.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const wikilinks = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  wikilinks as default
};
