import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"背景偏移","description":"","frontmatter":{"title":"背景偏移","sidebarTitle":"06 · 位置偏移","order":6,"cover":"https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=2070&q=80","banner":{"x":"30%","y":"80%"},"created":"2026-05-01T00:00:00.000Z","tags":["banner","position"]},"headers":[],"relativePath":"test/header/06-y-offset.md","filePath":"test/header/06-y-offset.md"}');
const _sfc_main = { name: "test/header/06-y-offset.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="背景位置偏移" tabindex="-1">背景位置偏移 <a class="header-anchor" href="#背景位置偏移" aria-label="Permalink to &quot;背景位置偏移&quot;">​</a></h1><p><code>banner.x: 30%</code> <code>banner.y: 80%</code> → CSS <code>background-position: 30% 80%</code>。</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("test/header/06-y-offset.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _06YOffset = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  _06YOffset as default
};
