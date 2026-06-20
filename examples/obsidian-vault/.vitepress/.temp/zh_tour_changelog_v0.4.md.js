import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"v0.4","description":"","frontmatter":{"title":"v0.4","sidebarTitle":"v0.4","order":4,"tags":["changelog","v0.4"],"created":"2026-05-21T00:00:00.000Z"},"headers":[],"relativePath":"zh/tour/changelog/v0.4.md","filePath":"zh/tour/changelog/v0.4.md"}');
const _sfc_main = { name: "zh/tour/changelog/v0.4.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="v0-4-—-文件夹链接重构-dev-自动重启" tabindex="-1">v0.4 — 文件夹链接重构 + dev 自动重启 <a class="header-anchor" href="#v0-4-—-文件夹链接重构-dev-自动重启" aria-label="Permalink to &quot;v0.4 — 文件夹链接重构 + dev 自动重启&quot;">​</a></h1><h2 id="breaking" tabindex="-1">Breaking <a class="header-anchor" href="#breaking" aria-label="Permalink to &quot;Breaking&quot;">​</a></h2><ul><li><strong>删除 <code>sidebarAuto.autoFolderIndex</code></strong> —— 整个 feature 不再存在,也不再写 <code>index.md</code> 文件。文件夹 URL 改由 <code>folderLinkOrder</code> 在解析时直接处理。老配置里的该字段 typecheck 仍过,运行时 warn 一次。</li></ul><h2 id="新增" tabindex="-1">新增 <a class="header-anchor" href="#新增" aria-label="Permalink to &quot;新增&quot;">​</a></h2><ul><li><strong><code>sidebarAuto.folderLinkOrder</code></strong>(默认 <code>[&#39;same-name&#39;, &#39;index&#39;, &#39;readme&#39;, &#39;first-file&#39;]</code>):文件夹链接解析顺序,<strong>第一个命中就用</strong>。同时影响 sidebar group link、nav tab、<code>[[folder/]]</code> wikilink。 <ul><li><code>[&#39;index&#39;]</code> 只用 <code>index.md</code>;<code>[]</code> = 文件夹永不可点;默认 = 全套兜底。</li></ul></li><li><strong>dev HMR 自动重启</strong>:增删 <code>.md</code> 文件或编辑 <code>_sidebar.md</code> → 自动 <code>server.restart()</code>,sidebar / nav 立刻反映,不用手动重启。</li><li><strong>章节号锚点放宽</strong>:<code>[[note#13]]</code> 现在能匹配 <code>## 13) 标题</code>、<code>## 13: 标题</code>、<code>## 13, 标题</code>、<code>## 13 — 标题</code>,但仍<strong>不</strong>匹版本号式 <code>## 13.5 Sub</code>(避免误匹)。</li></ul><h2 id="废弃-仍能用-v0-5-移除" tabindex="-1">废弃(仍能用,v0.5 移除) <a class="header-anchor" href="#废弃-仍能用-v0-5-移除" aria-label="Permalink to &quot;废弃(仍能用,v0.5 移除)&quot;">​</a></h2><ul><li><code>sidebarAuto.folderLinkFallback</code> → 用 <code>folderLinkOrder</code>。</li><li><code>sidebarAuto.layout: &#39;flat&#39;</code> → 用 <code>&#39;tree&#39;</code> 或 <code>&#39;per-folder&#39;</code>。</li><li><code>views.sidebar: &#39;auto&#39; | false</code> → 用 <code>views.injectInto</code>。</li></ul><p>升级要点见 <a href="/vitepress-allyouneed/tour/changelog/v0.5" class="wikilink" data-wikilink-target="tour/changelog/v0.5.md">v0.5 Changelog</a>。</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("zh/tour/changelog/v0.4.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const v0_4 = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  v0_4 as default
};
