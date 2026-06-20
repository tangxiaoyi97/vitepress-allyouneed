import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Misc sidebar override 演示","description":"","frontmatter":{"title":"Misc sidebar override 演示"},"headers":[],"relativePath":"test/misc/_sidebar.md","filePath":"test/misc/_sidebar.md"}');
const _sfc_main = { name: "test/misc/_sidebar.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><ul><li><a href="/vitepress-allyouneed/" class="wikilink" data-wikilink-target="index.md">🏁 Misc 起点</a></li><li>🧪 边缘 case + <ul><li><a href="/vitepress-allyouneed/test/misc/long-name-this-is-a-deliberately-very-very-long-file-name-for-sidebar-truncation-test" class="wikilink" data-wikilink-target="test/misc/long-name-this-is-a-deliberately-very-very-long-file-name-for-sidebar-truncation-test.md">超长标题</a></li><li><a href="/vitepress-allyouneed/test/misc/unicode-emojis-中英文混排" class="wikilink" data-wikilink-target="test/misc/unicode-emojis-中英文混排.md">Unicode 混排</a></li></ul></li><li>🔌 集成测试 - <ul><li><a href="/vitepress-allyouneed/test/misc/math" class="wikilink" data-wikilink-target="test/misc/math.md">KaTeX 数学</a></li><li><a href="/vitepress-allyouneed/test/misc/mermaid-diagram" class="wikilink" data-wikilink-target="test/misc/mermaid-diagram.md">Mermaid 图</a></li></ul></li><li><a href="/vitepress-allyouneed/test/misc/deep/nesting/level-1/level-2/level-3/deep-page" class="wikilink" data-wikilink-target="test/misc/deep/nesting/level-1/level-2/level-3/deep-page.md">🪜 6 层深嵌套</a></li><li><a href="https://github.com/tangxiaoyi97/vitepress-allyouneed" target="_blank" rel="noreferrer">📦 GitHub repo</a></li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("test/misc/_sidebar.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _sidebar = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  _sidebar as default
};
