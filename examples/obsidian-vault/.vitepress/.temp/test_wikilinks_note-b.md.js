import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Note B","description":"","frontmatter":{"title":"Note B","sidebarTitle":"Note B","order":2,"aliases":["B","Beta"],"tags":["wikilink","test"],"created":"2026-01-10T00:00:00.000Z"},"headers":[],"relativePath":"test/wikilinks/note-b.md","filePath":"test/wikilinks/note-b.md"}');
const _sfc_main = { name: "test/wikilinks/note-b.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="note-b" tabindex="-1">Note B <a class="header-anchor" href="#note-b" aria-label="Permalink to &quot;Note B&quot;">​</a></h1><p>我从 <a href="/vitepress-allyouneed/test/wikilinks/note-a" class="wikilink" data-wikilink-target="test/wikilinks/note-a.md">note-a</a> 回链。alias 测试:<a href="/vitepress-allyouneed/test/wikilinks/note-a" class="wikilink" data-wikilink-target="test/wikilinks/note-a.md">note-a</a> / <a href="/vitepress-allyouneed/test/wikilinks/note-a" class="wikilink" data-wikilink-target="test/wikilinks/note-a.md">note-a</a> / <a href="/vitepress-allyouneed/test/wikilinks/note-b" class="wikilink" data-wikilink-target="test/wikilinks/note-b.md">note-b</a>。</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("test/wikilinks/note-b.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const noteB = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  noteB as default
};
