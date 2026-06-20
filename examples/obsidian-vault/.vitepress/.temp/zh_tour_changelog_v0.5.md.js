import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"v0.5","description":"","frontmatter":{"title":"v0.5","sidebarTitle":"v0.5","order":5,"tags":["changelog","v0.5"],"created":"2026-06-20T00:00:00.000Z"},"headers":[],"relativePath":"zh/tour/changelog/v0.5.md","filePath":"zh/tour/changelog/v0.5.md"}');
const _sfc_main = { name: "zh/tour/changelog/v0.5.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="v0-5-—-主题底层化-图谱与健壮性" tabindex="-1">v0.5 — 主题底层化 + 图谱与健壮性 <a class="header-anchor" href="#v0-5-—-主题底层化-图谱与健壮性" aria-label="Permalink to &quot;v0.5 — 主题底层化 + 图谱与健壮性&quot;">​</a></h1><h2 id="主题集成-核心" tabindex="-1">主题集成(核心) <a class="header-anchor" href="#主题集成-核心" aria-label="Permalink to &quot;主题集成(核心)&quot;">​</a></h2><ul><li><strong>全部 7 个 CSS 文件进 <code>@layer vitepress-allyouneed</code></strong> —— 用户 / 第三方主题的普通 CSS 自动赢,无论权重或加载顺序。</li><li><strong>删除所有 <code>!important</code></strong> —— 不再需要,覆盖 100% 可行。</li><li><strong><code>defineTheme()</code> 工厂</strong>:零配置一行接入,或 <code>defineTheme({ extends: 第三方主题 })</code> 嵌套。</li><li>DocHeader banner 标题改用 <code>&lt;div role=&quot;heading&quot; aria-level=&quot;1&quot;&gt;</code>,躲开 VitePress 的 <code>.vp-doc h1</code> 选择器,让 layered 字号正确生效。</li></ul><h2 id="图谱体验" tabindex="-1">图谱体验 <a class="header-anchor" href="#图谱体验" aria-label="Permalink to &quot;图谱体验&quot;">​</a></h2><ul><li>缩小时节点名<strong>平滑淡出 / 放大时浮现</strong>(修了此前缩放标签不变淡的 bug —— SVG <code>opacity</code> 属性被 CSS 盖过,改用 CSS 变量驱动)。</li><li>hover <strong>稳定命中</strong>:加透明命中圈(半径 = max(可见+8, 12)),小节点也好点;放大反馈改用 <code>transform: scale</code> 不影响命中几何。</li><li>物理参数重调(更轻柔收敛、不抖),rAF 合帧渲染,ResizeObserver 防抖修自激循环。</li><li>移动端容器高度自适应。</li></ul><h2 id="健壮性" tabindex="-1">健壮性 <a class="header-anchor" href="#健壮性" aria-label="Permalink to &quot;健壮性&quot;">​</a></h2><ul><li><strong>视图数据校验</strong>:<code>useVaultData</code> 校验 <code>nodes/edges/stats/tags/meta</code> 五字段齐全,损坏数据优雅报错而非整页崩。</li><li><strong>日期统一 UTC 格式化</strong>:消除 SSR 构建机与浏览器时区不一致导致的水合不匹配。</li><li><strong>死链预扫线性化</strong>:换掉带回溯的正则,大量未闭合反引号等畸形输入不再卡死扫描。</li><li>dev asset 中间件加 ETag / 304 协商缓存,basename 兜底收紧避免错配。</li></ul><h2 id="修正" tabindex="-1">修正 <a class="header-anchor" href="#修正" aria-label="Permalink to &quot;修正&quot;">​</a></h2><ul><li>Tags 单行内联标签上限 3 个 + &quot;+N&quot; 折叠,长标题不再被挤没。</li><li>cover 图加载失败时占位底色改深色,保证白字可读。</li></ul><p>完整功能演示见 <a href="/vitepress-allyouneed/showcase" class="wikilink" data-wikilink-target="showcase/index.md">功能展示区</a>。</p></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("zh/tour/changelog/v0.5.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const v0_5 = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  v0_5 as default
};
