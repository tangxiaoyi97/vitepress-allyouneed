# vitepress-allyouneed 示例 vault

最小可运行示例。展示了:

- `[[wikilink]]` / `[[wikilink|alias]]`
- `[[note#heading]]` 锚点
- 中文文件名 / 中文标题 / 中文锚点
- frontmatter `aliases:`
- 路径形式 `[[projects/project-c]]`
- 同名冲突(top-level vs 深层),验证 `onConflict: 'shortest'`
- `![[image.svg]]` / `![[image.svg|300]]` / `![[image.svg|alt|300x200]]`
- `![[note]]` 整篇 transclusion
- `![[note#heading]]` 章节切片 transclusion
- 死链兜底(`[[不存在的笔记]]`)

## 启动

```bash
# 在 vitepress-allyouneed/ 根目录:先 build 一次本包(让 file: 链接有产物)
npm install
npm run build

# 再来 example 子目录:
cd examples/obsidian-vault
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
```

## 预期效果

- 首页 `/` 渲染上面那些 wikilink,全部点得动。
- `![[diagram.svg]]` 显示一个浅蓝色矩形 + 文字。
- `![[embedded]]` 把 `embedded.md` 整篇内联在首页底部。
- `![[note-a#二级标题]]` 只内联"二级标题"那一节,**不**包含"另一节"。
- 死链 `[[不存在的笔记]]` 渲染为带 `wikilink--dead` class 的 `<a>`(可加 CSS 标红)。

如果以上任意一条失败,就是 bug —— 提 issue。
