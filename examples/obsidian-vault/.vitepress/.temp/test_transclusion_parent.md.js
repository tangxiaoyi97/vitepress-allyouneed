import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Transclusion 测试","description":"","frontmatter":{"title":"Transclusion 测试","sidebarTitle":"Parent","order":2,"tags":["transclusion","test"]},"headers":[],"relativePath":"test/transclusion/parent.md","filePath":"test/transclusion/parent.md"}');
const _sfc_main = { name: "test/transclusion/parent.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="transclusion-测试" tabindex="-1">Transclusion 测试 <a class="header-anchor" href="#transclusion-测试" aria-label="Permalink to &quot;Transclusion 测试&quot;">​</a></h1><p>整篇嵌入:</p><div class="transclusion" data-source="test/transclusion/embedded.md" data-source-url="/test/transclusion/embedded"><a class="transclusion-source-link" href="/test/transclusion/embedded" aria-label="Go to source: test/transclusion/embedded.md" title="test/transclusion/embedded.md">↗</a><h1 id="embedded-source" tabindex="-1">Embedded source <a class="header-anchor" href="#embedded-source" aria-label="Permalink to &quot;Embedded source&quot;">​</a></h1><p>这是被嵌入的源笔记。</p><h2 id="二级标题" tabindex="-1">二级标题 <a class="header-anchor" href="#二级标题" aria-label="Permalink to &quot;二级标题&quot;">​</a></h2><p>二级标题内容,会被 <code>![[embedded#二级标题]]</code> 单独嵌入。</p><p>更多正文。</p></div><p>只嵌一节:</p><div class="transclusion" data-source="test/transclusion/embedded.md" data-source-url="/test/transclusion/embedded#二级标题"><a class="transclusion-source-link" href="/test/transclusion/embedded#二级标题" aria-label="Go to source: test/transclusion/embedded.md" title="test/transclusion/embedded.md">↗</a><p>二级标题内容,会被 <code>![[embedded#二级标题]]</code> 单独嵌入。</p><p>更多正文。</p></div><p>行内 transclusion(应该降级为链接,避免 <code>&lt;div&gt;</code> in <code>&lt;p&gt;</code> HTML 错误):正文中 <a class="wikilink wikilink--inline-transclusion-degraded" href="/test/transclusion/embedded" data-wikilink-target="embedded" title="Inline transclusion degraded; see console">embedded</a> 会变成链接。</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("test/transclusion/parent.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const parent = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  parent as default
};
