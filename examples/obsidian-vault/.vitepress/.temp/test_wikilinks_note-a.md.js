import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Note A","description":"","frontmatter":{"title":"Note A","sidebarTitle":"Note A","order":1,"aliases":["A","Alpha"],"tags":["wikilink","test"],"created":"2025-11-15T00:00:00.000Z"},"headers":[],"relativePath":"test/wikilinks/note-a.md","filePath":"test/wikilinks/note-a.md"}');
const _sfc_main = { name: "test/wikilinks/note-a.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="note-a" tabindex="-1">Note A <a class="header-anchor" href="#note-a" aria-label="Permalink to &quot;Note A&quot;">​</a></h1><p>回到 <a href="/vitepress-allyouneed/" class="wikilink" data-wikilink-target="index.md">首页</a> 或 <a href="/vitepress-allyouneed/test/wikilinks/note-b" class="wikilink" data-wikilink-target="test/wikilinks/note-b.md">跳到 B</a>。</p><h2 id="二级标题" tabindex="-1">二级标题 <a class="header-anchor" href="#二级标题" aria-label="Permalink to &quot;二级标题&quot;">​</a></h2><p><a href="/vitepress-allyouneed/test/wikilinks/note-a#二级标题" class="wikilink" data-wikilink-target="test/wikilinks/note-a.md">自指锚点</a> —— 用来测试同页锚点。</p><h2 id="另一节" tabindex="-1">另一节 <a class="header-anchor" href="#另一节" aria-label="Permalink to &quot;另一节&quot;">​</a></h2><h2 id="subheading" tabindex="-1">Subheading <a class="header-anchor" href="#subheading" aria-label="Permalink to &quot;Subheading&quot;">​</a></h2><p>英文 showcase 用这个稳定的英文标题做锚点演示(<code>[[note-a#Subheading]]</code>)。</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("test/wikilinks/note-a.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const noteA = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  noteA as default
};
