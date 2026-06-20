import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"一个很长的标题用来验证两行 wrap 和 text-wrap balance 的视觉效果","description":"","frontmatter":{"title":"一个很长的标题用来验证两行 wrap 和 text-wrap balance 的视觉效果","sidebarTitle":"09 · 长标题","order":9,"cover":"https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=2070&q=80","banner":{"y":"40%","overlay":0.55},"created":"2026-05-01T00:00:00.000Z","tags":["layout","long-title","wrap"]},"headers":[],"relativePath":"test/header/09-long-title.md","filePath":"test/header/09-long-title.md"}');
const _sfc_main = { name: "test/header/09-long-title.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="长标题自适应" tabindex="-1">长标题自适应 <a class="header-anchor" href="#长标题自适应" aria-label="Permalink to &quot;长标题自适应&quot;">​</a></h1><p><code>-webkit-line-clamp: 2</code> + <code>text-wrap: balance</code>,banner <code>min-height: 220px; max-height: 320px</code> 允许撑高容纳两行标题 + meta + tags。</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("test/header/09-long-title.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _09LongTitle = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  _09LongTitle as default
};
