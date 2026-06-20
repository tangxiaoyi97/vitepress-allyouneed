import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Embedded source","description":"","frontmatter":{"title":"Embedded source","sidebarTitle":"Embedded source","order":1,"tags":["transclusion","test","source"]},"headers":[],"relativePath":"test/transclusion/embedded.md","filePath":"test/transclusion/embedded.md"}');
const _sfc_main = { name: "test/transclusion/embedded.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="embedded-source" tabindex="-1">Embedded source <a class="header-anchor" href="#embedded-source" aria-label="Permalink to &quot;Embedded source&quot;">​</a></h1><p>这是被嵌入的源笔记。</p><h2 id="二级标题" tabindex="-1">二级标题 <a class="header-anchor" href="#二级标题" aria-label="Permalink to &quot;二级标题&quot;">​</a></h2><p>二级标题内容,会被 <code>![[embedded#二级标题]]</code> 单独嵌入。</p><p>更多正文。</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("test/transclusion/embedded.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const embedded = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  embedded as default
};
