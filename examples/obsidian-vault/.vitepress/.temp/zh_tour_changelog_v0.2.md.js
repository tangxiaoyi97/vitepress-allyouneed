import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"v0.2","description":"","frontmatter":{"title":"v0.2","sidebarTitle":"v0.2","order":2,"tags":["changelog","v0.2"],"created":"2026-02-15T00:00:00.000Z"},"headers":[],"relativePath":"zh/tour/changelog/v0.2.md","filePath":"zh/tour/changelog/v0.2.md"}');
const _sfc_main = { name: "zh/tour/changelog/v0.2.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="v0-2-—-自动生成视图" tabindex="-1">v0.2 — 自动生成视图 <a class="header-anchor" href="#v0-2-—-自动生成视图" aria-label="Permalink to &quot;v0.2 — 自动生成视图&quot;">​</a></h1><ul><li><strong>VaultGraph</strong> + <strong>VaultStats</strong> + <strong>Tags</strong> 三个视图组件</li><li><code>vault-data.json</code> 自动写到 <code>public/</code></li><li>正文 <code>#tag</code> inline rule(链到 <code>/_perspectives_/tags#tag</code>)</li><li>视图 URL 命名空间 <code>_perspectives_/</code>(避免和用户笔记撞名)</li><li>视图组自动追加到 sidebar 末尾</li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("zh/tour/changelog/v0.2.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const v0_2 = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  v0_2 as default
};
