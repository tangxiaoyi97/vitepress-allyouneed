import { ssrRenderAttrs } from "vue/server-renderer";
import { useSSRContext } from "vue";
import { _ as _export_sfc } from "./plugin-vue_export-helper.1tPrXgE0.js";
const __pageData = JSON.parse('{"title":"Showcase sidebar","description":"","frontmatter":{"title":"Showcase sidebar"},"headers":[],"relativePath":"showcase/_sidebar.md","filePath":"showcase/_sidebar.md"}');
const _sfc_main = { name: "showcase/_sidebar.md" };
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<div${ssrRenderAttrs(_attrs)}><ul><li><a href="/vitepress-allyouneed/" class="wikilink" data-wikilink-target="index.md">Overview</a></li><li><a href="/vitepress-allyouneed/showcase/wikilinks" class="wikilink" data-wikilink-target="showcase/wikilinks.md">Wikilinks</a></li><li><a href="/vitepress-allyouneed/showcase/transclusion" class="wikilink" data-wikilink-target="showcase/transclusion.md">Embeds &amp; Media</a></li><li><a href="/vitepress-allyouneed/showcase/callouts" class="wikilink" data-wikilink-target="showcase/callouts.md">Callouts</a></li><li><a href="/vitepress-allyouneed/showcase/syntax" class="wikilink" data-wikilink-target="showcase/syntax.md">Native Syntax</a></li><li><a href="/vitepress-allyouneed/showcase/views" class="wikilink" data-wikilink-target="showcase/views.md">Views</a></li></ul></div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("showcase/_sidebar.md");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _sidebar = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);
export {
  __pageData,
  _sidebar as default
};
