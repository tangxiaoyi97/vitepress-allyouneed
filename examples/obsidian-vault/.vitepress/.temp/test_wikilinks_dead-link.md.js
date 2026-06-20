import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Dead link","description":"","frontmatter":{"title":"Dead link","sidebarTitle":"死链测试","order":4,"tags":["wikilink","test","dead"]},"headers":[],"relativePath":"test/wikilinks/dead-link.md","filePath":"test/wikilinks/dead-link.md"}');
const _sfc_main = { name: "test/wikilinks/dead-link.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="dead-link-测试" tabindex="-1">Dead link 测试 <a class="header-anchor" href="#dead-link-测试" aria-label="Permalink to &quot;Dead link 测试&quot;">​</a></h1><p>故意指向不存在的笔记:<a class="wikilink wikilink--dead" data-wikilink-target="不存在的笔记" title="Dead link: [[不存在的笔记]] not found">不存在的笔记</a> — 应该显示为带 dead 标记的链接,console 也会 warn。</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("test/wikilinks/dead-link.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const deadLink = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  deadLink as default
};
