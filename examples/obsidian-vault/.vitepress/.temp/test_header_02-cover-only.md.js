import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"只有 cover","description":"","frontmatter":{"title":"只有 cover","sidebarTitle":"02 · 只 cover","order":2,"cover":"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2070&q=80","tags":["banner","defaults"]},"headers":[],"relativePath":"test/header/02-cover-only.md","filePath":"test/header/02-cover-only.md"}');
const _sfc_main = { name: "test/header/02-cover-only.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="只有-cover" tabindex="-1">只有 cover <a class="header-anchor" href="#只有-cover" aria-label="Permalink to &quot;只有 cover&quot;">​</a></h1><p>只写 <code>cover</code>,所有 <code>banner.*</code> 用默认值(<code>x/y: center</code>,<code>blur: 0</code>,<code>opacity: 1</code>,<code>overlay: 0.6</code>,<code>text: light</code>)。最常见的零配置写法。</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("test/header/02-cover-only.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _02CoverOnly = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  _02CoverOnly as default
};
