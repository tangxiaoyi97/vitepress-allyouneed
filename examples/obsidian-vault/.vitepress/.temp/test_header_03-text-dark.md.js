import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"浅色 cover + 深色文字","description":"","frontmatter":{"title":"浅色 cover + 深色文字","sidebarTitle":"03 · 深色文字","order":3,"cover":"https://images.unsplash.com/photo-1557804506-669a67965ba0?w=2070&q=80","banner":{"overlay":0.05,"text":"dark"},"created":"2026-04-01T00:00:00.000Z","tags":["banner","light-cover"]},"headers":[],"relativePath":"test/header/03-text-dark.md","filePath":"test/header/03-text-dark.md"}');
const _sfc_main = { name: "test/header/03-text-dark.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="浅色-cover-深色文字" tabindex="-1">浅色 cover + 深色文字 <a class="header-anchor" href="#浅色-cover-深色文字" aria-label="Permalink to &quot;浅色 cover + 深色文字&quot;">​</a></h1><p>cover 本身浅色,撤掉 overlay + 用 <code>text: dark</code>,文字走主题深色,tag 也自动切到主题色版本(白色半透明 + 深色文字)。</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("test/header/03-text-dark.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _03TextDark = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  _03TextDark as default
};
