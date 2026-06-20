import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"","description":"","frontmatter":{"layout":"home","hero":{"name":"vitepress-allyouneed","text":"把 Obsidian vault 变成网站","tagline":"一个插件搞定 wikilinks、嵌入、Obsidian 语法、关系图、侧边栏、文档头 —— 零配置即用","actions":[{"theme":"brand","text":"功能展示","link":"/showcase/"},{"theme":"alt","text":"立刻上手","link":"/guide/overview"},{"theme":"alt","text":"v0.5 巡览","link":"/tour/v0.5-tour"}]},"features":[{"icon":"🔗","title":"Wikilinks","details":"`[[note]]`、`[[note|别名]]`、`[[note#标题]]`、路径形式与文件夹形式。死链可视化标记,锚点支持精确 / 章节号 / 模糊三种匹配。","link":"/showcase/wikilinks","linkText":"看效果"},{"icon":"📄","title":"嵌入 & 媒体","details":"`![[note]]` 整页转译、`![[note#标题]]` 片段嵌入;`![[img.png|400]]` 图片、音频、视频、PDF 一并支持,自动走资源管线。","link":"/showcase/transclusion","linkText":"看效果"},{"icon":"💬","title":"13 种 Callouts","details":"note / tip / warning / danger … 全套 Obsidian callout,支持折叠 `+`/`-`、自定义标题、嵌套,标题内可写 Markdown。","link":"/showcase/callouts","linkText":"看效果"},{"icon":"✍️","title":"原生语法","details":"`==高亮==`、`%%注释%%`、Pandoc 脚注 `[^1]`、`^block-id` 锚点、正文 `#标签` —— 纯笔记 vault 零修改可用。","link":"/showcase/syntax","linkText":"看效果"},{"icon":"🕸️","title":"三大视图","details":"VaultGraph 关系图(D3 力导向)、VaultStats 统计、Tags 标签云 —— 从 vault 自动生成,挂到导航即可浏览。","link":"/showcase/views","linkText":"看效果"},{"icon":"📂","title":"自动侧边栏","details":"sidebar 从目录结构自动嵌套生成;`_sidebar.md` 可手动覆盖;tree / per-folder 两种布局;排序、文件夹链接全可配。","link":"/guide/docs/sidebar-auto","linkText":"文档"},{"icon":"🖼️","title":"文档头 banner","details":"文档顶部 cover 图 / 创建·更新日期 / 字数阅读时长 / 标签一栏齐全;`banner` frontmatter 可调位置、模糊、透明度、暗化。","link":"/guide/docs/doc-header","linkText":"文档"},{"icon":"🎨","title":"主题可覆盖","details":"所有视觉走 `--ayn-*` CSS 变量,`@layer` 隔离不污染全局。第三方主题后加载即可换皮,无需 fork。","link":"/guide/advanced/theme-interop","linkText":"文档"},{"icon":"🌐","title":"i18n 就绪","details":"基于 VitePress 原生 locales。本插件自动为每个语言生成对应 sidebar,root 与子 locale 互不串扰。","link":"/guide/docs/configure","linkText":"文档"}]},"headers":[],"relativePath":"zh/index.md","filePath":"zh/index.md"}');
const _sfc_main = { name: "zh/index.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("zh/index.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  index as default
};
