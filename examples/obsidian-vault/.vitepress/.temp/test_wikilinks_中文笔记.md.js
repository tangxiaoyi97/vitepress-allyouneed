import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"中文笔记","description":"","frontmatter":{"title":"中文笔记","sidebarTitle":"中文笔记","order":3,"tags":["wikilink","test","中文"]},"headers":[],"relativePath":"test/wikilinks/中文笔记.md","filePath":"test/wikilinks/中文笔记.md"}');
const _sfc_main = { name: "test/wikilinks/中文笔记.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="中文笔记" tabindex="-1">中文笔记 <a class="header-anchor" href="#中文笔记" aria-label="Permalink to &quot;中文笔记&quot;">​</a></h1><p>测试中文 wikilink + 中文 tag <a class="ayn-tag" data-tag="中文测试" href="/vitepress-allyouneed/_perspectives_/tags#%E4%B8%AD%E6%96%87%E6%B5%8B%E8%AF%95">#中文测试</a>。</p><p><a href="/vitepress-allyouneed/test/wikilinks/note-a" class="wikilink" data-wikilink-target="test/wikilinks/note-a.md">note-a</a> 还能跳回去。</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("test/wikilinks/中文笔记.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const ____ = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  ____ as default
};
