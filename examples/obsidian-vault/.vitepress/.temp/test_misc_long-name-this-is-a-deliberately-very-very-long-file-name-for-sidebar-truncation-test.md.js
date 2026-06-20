import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"超长文件名 / 标题极限测试 —— 验证 sidebar 截断、wrap、tooltip,以及 banner 内大标题 2 行 line-clamp + text-wrap balance 的视觉效果","description":"","frontmatter":{"title":"超长文件名 / 标题极限测试 —— 验证 sidebar 截断、wrap、tooltip,以及 banner 内大标题 2 行 line-clamp + text-wrap balance 的视觉效果","sidebarTitle":"超长文件名 / 标题极限测试 —— 验证 sidebar 截断、wrap、tooltip,以及 banner 内大标题 2 行 line-clamp + text-wrap balance 的视觉效果","order":1,"cover":"https://images.unsplash.com/photo-1488972685288-c3fd157d7c7a?w=2070&q=80","banner":{"overlay":0.55},"tags":["test","long-name","edge-case","layout"]},"headers":[],"relativePath":"test/misc/long-name-this-is-a-deliberately-very-very-long-file-name-for-sidebar-truncation-test.md","filePath":"test/misc/long-name-this-is-a-deliberately-very-very-long-file-name-for-sidebar-truncation-test.md"}');
const _sfc_main = { name: "test/misc/long-name-this-is-a-deliberately-very-very-long-file-name-for-sidebar-truncation-test.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><h1 id="超长测试" tabindex="-1">超长测试 <a class="header-anchor" href="#超长测试" aria-label="Permalink to &quot;超长测试&quot;">​</a></h1><p>观察:</p><ul><li>左侧 sidebar 这个 item 应该 wrap / 截断,而不是把 sidebar 撑爆横向 overflow</li><li>banner 内大标题应该最多两行(<code>-webkit-line-clamp: 2</code>),超出 <code>…</code> 截断</li><li>浏览器 tab 标题(<code>document.title</code>)也会被截</li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("test/misc/long-name-this-is-a-deliberately-very-very-long-file-name-for-sidebar-truncation-test.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const longNameThisIsADeliberatelyVeryVeryLongFileNameForSidebarTruncationTest = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  longNameThisIsADeliberatelyVeryVeryLongFileNameForSidebarTruncationTest as default
};
