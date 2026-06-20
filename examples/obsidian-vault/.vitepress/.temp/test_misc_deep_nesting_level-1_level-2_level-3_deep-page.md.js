import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"深嵌套测试","description":"","frontmatter":{"title":"深嵌套测试","sidebarTitle":"Deep nested page","order":1,"tags":["test","depth"]},"headers":[],"relativePath":"test/misc/deep/nesting/level-1/level-2/level-3/deep-page.md","filePath":"test/misc/deep/nesting/level-1/level-2/level-3/deep-page.md"}');
const _sfc_main = { name: "test/misc/deep/nesting/level-1/level-2/level-3/deep-page.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="深嵌套-6-层" tabindex="-1">深嵌套 6 层 <a class="header-anchor" href="#深嵌套-6-层" aria-label="Permalink to &quot;深嵌套 6 层&quot;">​</a></h1><p><code>maxDepth</code> 选项控制 sidebar 嵌套上限。默认无限,这页位于 6 层深路径:</p><p><code>test/misc/deep/nesting/level-1/level-2/level-3/deep-page.md</code></p><p>如果在 config 里设 <code>sidebarAuto.maxDepth: 3</code>,这页<strong>不会</strong>出现在 sidebar(被截断)。</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("test/misc/deep/nesting/level-1/level-2/level-3/deep-page.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const deepPage = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  deepPage as default
};
