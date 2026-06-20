import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Unicode 🌏 emoji 中英文混排测试","description":"","frontmatter":{"title":"Unicode 🌏 emoji 中英文混排测试","sidebarTitle":"🌏 Unicode mix","order":2,"tags":["test","unicode","emoji","中文"]},"headers":[],"relativePath":"test/misc/unicode-emojis-中英文混排.md","filePath":"test/misc/unicode-emojis-中英文混排.md"}');
const _sfc_main = { name: "test/misc/unicode-emojis-中英文混排.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="unicode-emoji-中英文混排" tabindex="-1">Unicode + emoji + 中英文混排 <a class="header-anchor" href="#unicode-emoji-中英文混排" aria-label="Permalink to &quot;Unicode + emoji + 中英文混排&quot;">​</a></h1><p>测试目的:验证文件名、tag、wikilink 等在含 emoji 和中文情况下的稳定性。</p><ul><li>中文 wikilink:<a href="/vitepress-allyouneed/test/wikilinks/note-a" class="wikilink" data-wikilink-target="test/wikilinks/note-a.md">Note A</a> / <a href="/vitepress-allyouneed/test/wikilinks/note-b" class="wikilink" data-wikilink-target="test/wikilinks/note-b.md">note-b</a></li><li>中文 <a class="ayn-tag" data-tag="中文测试" href="/vitepress-allyouneed/_perspectives_/tags#%E4%B8%AD%E6%96%87%E6%B5%8B%E8%AF%95">#中文测试</a> tag</li><li>emoji 在 title 和 sidebar 里:🚀 / 📚 / ✨</li><li>半角全角混排:hello,世界 (semi),hello,世界 (full)</li><li>日韩字符:こんにちは / 안녕하세요</li><li>RTL 测试(阿拉伯文):مرحبا بالعالم</li><li>数学符号:∑∏∫∮ ≠≈∞ ⊕⊗</li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("test/misc/unicode-emojis-中英文混排.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const unicodeEmojis______ = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  unicodeEmojis______ as default
};
