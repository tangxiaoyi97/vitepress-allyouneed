import { ssrRenderAttrs, ssrRenderStyle } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Install","description":"","frontmatter":{"title":"Install","sidebarTitle":"Install","order":1,"tags":["guide","setup"]},"headers":[],"relativePath":"zh/guide/docs/install.md","filePath":"zh/guide/docs/install.md"}');
const _sfc_main = { name: "zh/guide/docs/install.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="install" tabindex="-1">Install <a class="header-anchor" href="#install" aria-label="Permalink to &quot;Install&quot;">​</a></h1><div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="${ssrRenderStyle({ "--shiki-light": "#6F42C1", "--shiki-dark": "#B392F0" })}">npm</span><span style="${ssrRenderStyle({ "--shiki-light": "#032F62", "--shiki-dark": "#9ECBFF" })}"> i</span><span style="${ssrRenderStyle({ "--shiki-light": "#005CC5", "--shiki-dark": "#79B8FF" })}"> -D</span><span style="${ssrRenderStyle({ "--shiki-light": "#032F62", "--shiki-dark": "#9ECBFF" })}"> vitepress-allyouneed</span><span style="${ssrRenderStyle({ "--shiki-light": "#032F62", "--shiki-dark": "#9ECBFF" })}"> vitepress</span></span></code></pre></div><ul><li>VitePress 是 peerDependency,本插件不锁版本</li><li>Node 18+ 推荐</li></ul><h2 id="文件结构" tabindex="-1">文件结构 <a class="header-anchor" href="#文件结构" aria-label="Permalink to &quot;文件结构&quot;">​</a></h2><p>最小可运行:</p><div class="language- vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>my-vault/</span></span>
<span class="line"><span>├── .vitepress/</span></span>
<span class="line"><span>│   ├── config.ts</span></span>
<span class="line"><span>│   └── theme/</span></span>
<span class="line"><span>│       └── index.ts</span></span>
<span class="line"><span>├── package.json</span></span>
<span class="line"><span>└── (你的 .md 笔记,任意嵌套)</span></span></code></pre></div><p>下一步:<a href="/vitepress-allyouneed/guide/docs/configure" class="wikilink" data-wikilink-target="guide/docs/configure.md">配置</a>。</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("zh/guide/docs/install.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const install = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  install as default
};
