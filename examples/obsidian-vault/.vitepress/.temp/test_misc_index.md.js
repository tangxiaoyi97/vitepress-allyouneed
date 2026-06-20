import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Misc Tests","description":"","frontmatter":{"title":"Misc Tests","sidebarTitle":"Misc","order":4,"tags":["test","misc"]},"headers":[],"relativePath":"test/misc/index.md","filePath":"test/misc/index.md"}');
const _sfc_main = { name: "test/misc/index.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="杂项测试" tabindex="-1">杂项测试 <a class="header-anchor" href="#杂项测试" aria-label="Permalink to &quot;杂项测试&quot;">​</a></h1><p>边缘 case / 集成测试集合:</p><ul><li><a href="/vitepress-allyouneed/test/misc/long-name-this-is-a-deliberately-very-very-long-file-name-for-sidebar-truncation-test" class="wikilink" data-wikilink-target="test/misc/long-name-this-is-a-deliberately-very-very-long-file-name-for-sidebar-truncation-test.md">超长文件名</a></li><li><a href="/vitepress-allyouneed/test/misc/unicode-emojis-中英文混排" class="wikilink" data-wikilink-target="test/misc/unicode-emojis-中英文混排.md">Unicode + emoji + 中英混排</a></li><li><a href="/vitepress-allyouneed/test/misc/math" class="wikilink" data-wikilink-target="test/misc/math.md">数学公式(KaTeX)</a> —— 需要用户启用 VitePress <code>markdown.math</code></li><li><a href="/vitepress-allyouneed/test/misc/mermaid-diagram" class="wikilink" data-wikilink-target="test/misc/mermaid-diagram.md">Mermaid 流程图</a> —— 需要第三方插件</li><li><a href="/vitepress-allyouneed/test/misc/deep/nesting/level-1/level-2/level-3/deep-page" class="wikilink" data-wikilink-target="test/misc/deep/nesting/level-1/level-2/level-3/deep-page.md">超深嵌套(6 层)</a></li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("test/misc/index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  index as default
};
