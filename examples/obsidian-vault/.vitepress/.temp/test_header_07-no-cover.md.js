import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Mode B(无 banner)","description":"","frontmatter":{"title":"Mode B(无 banner)","sidebarTitle":"07 · 无 cover","order":7,"created":"2026-02-20T00:00:00.000Z","updated":"2026-05-15T00:00:00.000Z","tags":["banner","no-cover"]},"headers":[],"relativePath":"test/header/07-no-cover.md","filePath":"test/header/07-no-cover.md"}');
const _sfc_main = { name: "test/header/07-no-cover.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="mode-b-无-banner" tabindex="-1">Mode B(无 banner) <a class="header-anchor" href="#mode-b-无-banner" aria-label="Permalink to &quot;Mode B(无 banner)&quot;">​</a></h1><p>不写 cover → 不画背景块。标题字号自动<strong>增大</strong>(补偿无 banner 视觉缺失),meta/tags 走主题色普通排版。</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("test/header/07-no-cover.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _07NoCover = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  _07NoCover as default
};
