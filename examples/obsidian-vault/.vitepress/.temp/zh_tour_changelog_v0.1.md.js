import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"v0.1","description":"","frontmatter":{"title":"v0.1","sidebarTitle":"v0.1","order":1,"tags":["changelog","v0.1"],"created":"2025-09-10T00:00:00.000Z"},"headers":[],"relativePath":"zh/tour/changelog/v0.1.md","filePath":"zh/tour/changelog/v0.1.md"}');
const _sfc_main = { name: "zh/tour/changelog/v0.1.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="v0-1-—-initial-release" tabindex="-1">v0.1 — initial release <a class="header-anchor" href="#v0-1-—-initial-release" aria-label="Permalink to &quot;v0.1 — initial release&quot;">​</a></h1><ul><li>wikilinks <code>[[note]]</code> / <code>[[note|alias]]</code> / <code>[[note#heading]]</code></li><li>image embeds <code>![[img.png|400x300|alt]]</code></li><li>transclusion <code>![[note]]</code> / <code>![[note#heading]]</code></li><li>完整 VaultIndex(files / byBasename / byAlias / byUrl / headings / tags / backlinks)</li><li>自动资源管线(dev middleware + build emitFile)</li><li>死链 + 半死链(锚点不匹配)分级处理</li><li>VitePress 同款 slugifier</li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("zh/tour/changelog/v0.1.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const v0_1 = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  v0_1 as default
};
