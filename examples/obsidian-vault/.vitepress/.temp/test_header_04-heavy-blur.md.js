import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"重模糊 hero","description":"","frontmatter":{"title":"重模糊 hero","sidebarTitle":"04 · 重模糊","order":4,"cover":"https://images.unsplash.com/photo-1518770660439-4636190af475?w=2070&q=80","banner":{"blur":12,"overlay":0.35},"created":"2026-03-15T00:00:00.000Z","updated":"2026-05-10T00:00:00.000Z","tags":["banner","blur"]},"headers":[],"relativePath":"test/header/04-heavy-blur.md","filePath":"test/header/04-heavy-blur.md"}');
const _sfc_main = { name: "test/header/04-heavy-blur.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="重模糊-hero" tabindex="-1">重模糊 hero <a class="header-anchor" href="#重模糊-hero" aria-label="Permalink to &quot;重模糊 hero&quot;">​</a></h1><p><code>banner.blur: 12</code> 让 cover 变纯氛围底。<code>transform: scale(1.05)</code> 自动启用,边缘虚化不露白。</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("test/header/04-heavy-blur.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _04HeavyBlur = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  _04HeavyBlur as default
};
