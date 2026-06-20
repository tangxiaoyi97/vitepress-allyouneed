import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"v0.3","description":"","frontmatter":{"title":"v0.3","sidebarTitle":"v0.3","order":3,"tags":["changelog","v0.3"],"created":"2026-05-20T00:00:00.000Z"},"headers":[],"relativePath":"zh/tour/changelog/v0.3.md","filePath":"zh/tour/changelog/v0.3.md"}');
const _sfc_main = { name: "zh/tour/changelog/v0.3.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="v0-3-—-obsidian-语法-sidebar-nav-自动化-docheader" tabindex="-1">v0.3 — Obsidian 语法 + sidebar/nav 自动化 + DocHeader <a class="header-anchor" href="#v0-3-—-obsidian-语法-sidebar-nav-自动化-docheader" aria-label="Permalink to &quot;v0.3 — Obsidian 语法 + sidebar/nav 自动化 + DocHeader&quot;">​</a></h1><h2 id="新模块-markdown-it" tabindex="-1">新模块(markdown-it) <a class="header-anchor" href="#新模块-markdown-it" aria-label="Permalink to &quot;新模块(markdown-it)&quot;">​</a></h2><ul><li>callouts(13 种 + 别名 + 折叠 + 嵌套)</li><li>highlight <code>==text==</code></li><li>comments <code>%%inline%%</code> / 块注释</li><li>footnotes(Pandoc 风格)</li><li>block-refs(<code>^id</code> 渲染层 anchor)</li><li>audio / video / pdf embed(路由扩展,复用 image asset pipeline)</li></ul><h2 id="新主题能力" tabindex="-1">新主题能力 <a class="header-anchor" href="#新主题能力" aria-label="Permalink to &quot;新主题能力&quot;">​</a></h2><ul><li><strong>DocHeader</strong> banner(cover / dates / tags / word-count / 自动 H1 隐藏)</li><li><strong>Layout</strong> wrapper + <code>cssclasses</code> frontmatter 支持</li><li>主题色 + 扁平化 tag pills + 标题下分割线 + 长标题两行 wrap</li></ul><h2 id="新工程化" tabindex="-1">新工程化 <a class="header-anchor" href="#新工程化" aria-label="Permalink to &quot;新工程化&quot;">​</a></h2><ul><li><strong>sidebarAuto</strong> 完整套件: <ul><li><code>layout: tree / flat / per-folder</code></li><li><code>autoNav: true</code> 自动 nav tabs</li><li><code>autoFolderIndex: off / top-level / all</code> 自动文件夹 index</li><li><code>groupLink: all / top-level / off</code></li><li><code>groupOrder</code> / <code>maxDepth</code> / <code>stripNumericPrefix</code></li><li>frontmatter <code>sidebarTitle/order/sidebarHidden/sidebarCollapsed/sidebarGroup</code></li></ul></li><li><strong>dirIndex 优先级</strong>:<code>&lt;folder&gt;.md</code> &gt; <code>index.md</code> &gt; <code>README.md</code></li><li>空 frontmatter-only dirIndex:不当 link,但 frontmatter 仍生效,且不被覆盖</li></ul><p>详见 <a href="/vitepress-allyouneed/tour/v0.3-tour" class="wikilink" data-wikilink-target="tour/v0.3-tour.md">v0.3 Tour</a> 与 <a href="/vitepress-allyouneed/guide/docs/sidebar-auto" class="wikilink" data-wikilink-target="guide/docs/sidebar-auto.md">Sidebar 自动生成</a>。</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("zh/tour/changelog/v0.3.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const v0_3 = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  v0_3 as default
};
