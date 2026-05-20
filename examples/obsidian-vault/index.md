---
layout: home

hero:
  name: vitepress-allyouneed
  text: Obsidian vault → VitePress, 零配置
  tagline: 一个插件搞定 wikilinks、嵌入、Obsidian 语法、视图、侧边栏、文档头部
  actions:
    - theme: brand
      text: 立刻上手
      link: /guide/overview
    - theme: alt
      text: v0.3 特性巡览
      link: /tour/v0.3-tour
    - theme: alt
      text: 测试沙盒
      link: /test/header/

features:
  - icon: 🔗
    title: Wikilinks + 嵌入
    details: '`[[note]]` / `[[note#heading|alias]]` / `![[img\|400]]` / `![[movie.mp4\|640x360]]` / `![[note]]` 整篇 transclusion，全套 Obsidian 链接语法。'
  - icon: 📝
    title: Obsidian 原生语法
    details: 13 种 callouts(+折叠+别名+嵌套)、`==高亮==`、`%%注释%%`、Pandoc footnotes、`^block-ref`、正文 `#tag`,纯笔记 vault 零修改可用。
  - icon: 🎬
    title: 自动视图
    details: 'VaultGraph 关系图 / VaultStats 统计 / Tags 标签云 三个视图组件自动生成,挂到 nav 下拉。'
  - icon: 📂
    title: 自动侧边栏 + nav
    details: 'sidebar 从目录结构自动嵌套生成;`autoNav` 把顶级目录变 nav tabs。三种 layout 自由切换。'
  - icon: 🖼️
    title: DocHeader banner
    details: '文档顶部 cover/dates/tags/word-count 一栏齐全;`frontmatter.banner` 可调位置/模糊/透明度/暗化。'
  - icon: 🎨
    title: 主题完全可覆盖
    details: 所有视觉走 `--ayn-*` CSS 变量。第三方主题后加载就能换皮,不需要 fork。

---
