import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"","description":"","frontmatter":{"sidebarTitle":"08 · 空 frontmatter","order":8},"headers":[],"relativePath":"test/header/08-empty.md","filePath":"test/header/08-empty.md"}');
const _sfc_main = { name: "test/header/08-empty.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><p>完全空 frontmatter。标题 fallback 文件名(<code>08-empty</code>),meta 只剩字数 + 阅读时长,无 tags、无 cover。</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("test/header/08-empty.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _08Empty = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  _08Empty as default
};
