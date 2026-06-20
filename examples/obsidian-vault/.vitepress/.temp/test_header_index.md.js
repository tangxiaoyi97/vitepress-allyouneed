import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Header Tests","description":"","frontmatter":{"title":"Header Tests","sidebarTitle":"Header Tests","order":1,"sidebarCollapsed":false,"tags":["test","header"],"created":"2026-05-20T00:00:00.000Z"},"headers":[],"relativePath":"test/header/index.md","filePath":"test/header/index.md"}');
const _sfc_main = { name: "test/header/index.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="header-tests" tabindex="-1">Header Tests <a class="header-anchor" href="#header-tests" aria-label="Permalink to &quot;Header Tests&quot;">​</a></h1><p>每页测试 <code>cover</code> + <code>banner.*</code> 的一种组合,挨个看效果:</p><ul><li><a href="/vitepress-allyouneed/test/header/01-full" class="wikilink" data-wikilink-target="test/header/01-full.md">01-full</a> — 所有 banner 选项满配</li><li><a href="/vitepress-allyouneed/test/header/02-cover-only" class="wikilink" data-wikilink-target="test/header/02-cover-only.md">02-cover-only</a> — 只 cover,无 banner 配置(默认值)</li><li><a href="/vitepress-allyouneed/test/header/03-text-dark" class="wikilink" data-wikilink-target="test/header/03-text-dark.md">03-text-dark</a> — 浅色 cover + <code>banner.text: dark</code></li><li><a href="/vitepress-allyouneed/test/header/04-heavy-blur" class="wikilink" data-wikilink-target="test/header/04-heavy-blur.md">04-heavy-blur</a> — <code>banner.blur: 12</code> hero 模糊</li><li><a href="/vitepress-allyouneed/test/header/05-translucent" class="wikilink" data-wikilink-target="test/header/05-translucent.md">05-translucent</a> — <code>banner.opacity: 0.35</code></li><li><a href="/vitepress-allyouneed/test/header/06-y-offset" class="wikilink" data-wikilink-target="test/header/06-y-offset.md">06-y-offset</a> — <code>banner.x/y</code> 位置偏移</li><li><a href="/vitepress-allyouneed/test/header/07-no-cover" class="wikilink" data-wikilink-target="test/header/07-no-cover.md">07-no-cover</a> — Mode B:无 cover,标题字号自动增大</li><li><a href="/vitepress-allyouneed/test/header/08-empty" class="wikilink" data-wikilink-target="test/header/08-empty.md">08-empty</a> — 空 frontmatter,标题 fallback 文件名</li><li><a href="/vitepress-allyouneed/test/header/09-long-title" class="wikilink" data-wikilink-target="test/header/09-long-title.md">09-long-title</a> — 长标题 → 两行 wrap + balance + banner 撑高</li></ul><p>(<strong>说明:本 index.md 是测试组特意保留的索引页;其它 group 都没有 index,可以对比看效果</strong>)</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("test/header/index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  index as default
};
