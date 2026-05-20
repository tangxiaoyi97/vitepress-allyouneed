---
title: 手动覆盖 sidebar(_sidebar.md)
sidebarTitle: Sidebar Override
order: 6
tags: [guide, sidebar, override]
---

# `_sidebar.md` —— 手动覆盖某目录的 sidebar

`autoFolderIndex` / `sidebarAuto` 自动生成的 sidebar 99% 场景够用。少数情况你想**完全自己定**某个目录的 sidebar(改顺序、加外链、分组重命名 …),不想动 frontmatter 也不想动 config —— 这时在该目录下放一个 `_sidebar.md` 即可。

## 触发条件

某 DirNode 下存在 `_sidebar.md`(basename 大小写不敏感) → 该目录**整段** sidebar 用这个文件定义,完全跳过 `sidebarAuto` 的扫描。

- 文件本身**不会**出现在 sidebar item 里(它是配置载体)
- frontmatter 优先于 markdown list(两者都写时 frontmatter 生效)
- 解析失败 → 降级到自动生成,console.warn

## 两种写法

### 1) frontmatter 数组(VitePress 原生 shape)

```yaml
---
sidebar:
  - text: 概览
    link: /guide/overview
  - text: 文档
    collapsed: false
    items:
      - text: 安装
        link: /guide/docs/install
      - text: 配置
        link: /guide/docs/configure
      - text: Sidebar 自动生成
        link: /guide/docs/sidebar-auto
  - text: 进阶
    collapsed: true
    items:
      - text: 自定义主题
        link: /guide/advanced/custom-theme
      - text: 主题协作
        link: /guide/advanced/theme-interop
---
```

字段全部按 VitePress `SidebarItem` 标准:`text` / `link` / `items` / `collapsed` / `base`。

### 2) Markdown 列表(更 Obsidian 友好)

```markdown
- [[overview|概览]]
- 文档 +
  - [[docs/install|安装]]
  - [[docs/configure|配置]]
  - [[docs/sidebar-auto|Sidebar 自动生成]]
- 进阶 -
  - [[advanced/custom-theme|自定义主题]]
  - [[advanced/theme-interop|主题协作]]
- [外部链接](https://example.com)
```

#### 列表语法

| 写法 | 解析 |
|---|---|
| `- [[note]]` | item 文本 = note 的 sidebarTitle/title/H1/basename,link = note.url |
| `- [[note\|文本]]` | item 文本 = 文本,link = note.url |
| `- [text](url)` | 普通链接(外链/绝对 URL 都行) |
| `- 纯文字` | group title(无 link,可有子级) |
| `- 文字 +` | 同上,后缀 `+` = group 默认展开 |
| `- 文字 -` | 同上,后缀 `-` = group 默认折叠 |

#### 缩进

- 2 空格 = 一级
- tab 等价 2 空格
- 缩进决定层级,**第一行的缩进 = 0**(顶级)

```markdown
- A          (0 空格 → 顶级)
  - A.1      (2 空格 → A 的子级)
    - A.1.x  (4 空格 → A.1 的子级)
- B          (0 空格 → 顶级)
```

#### 路径解析

`[[wikilink]]` 的 target 解析顺序(沿用 wikilink 模块的规则):

1. 如含 `/` → 当作相对 `_sidebar.md` 所在目录,或绝对路径
2. 否则当 alias 查
3. 否则当 basename 查(全 vault)
4. 找不到 → link 留空,只显示文字(不会变死链 wikilink)

## 行为细节

- **作用范围只这一目录**:`/guide/_sidebar.md` 只覆盖 `/guide/` 这一层 sidebar。子目录(`/guide/docs/`) 仍按自动规则,**除非**该子目录也放了一份 `_sidebar.md`
- **per-folder layout**:`_sidebar.md` 完全替换该顶层 path 的 sidebar 数组(包括根 dirIndex link 和子组渲染)
- **`tree` / `flat` layout**:`_sidebar.md` 替换该目录在嵌套 sidebar 里的位置(它 + 子级)
- **frontmatter.sidebar 数组里的 link 字段你写啥就是啥**,不会做相对路径解析(VitePress 原样使用);用 markdown list 形式才能享受 wikilink 路径解析
- **`_sidebar.md` 不进 stats / graph / tags 视图**(它有 `_` 前缀 basename,被视图过滤排除)

## 示例

vault 里:
```
guide/
├── _sidebar.md       ← 手写覆盖
├── overview.md
├── docs/
│   ├── install.md
│   └── configure.md
└── advanced/
    ├── custom-theme.md
    └── theme-interop.md
```

`guide/_sidebar.md`:
```markdown
---
title: Guide sidebar
---

- [[overview|🚀 开始使用]]
- 📚 文档 +
  - [[docs/install|安装]]
  - [[docs/configure|配置]]
- 🛠️ 进阶 -
  - [[advanced/custom-theme|自定义主题]]
  - [[advanced/theme-interop|主题协作]]
- [GitHub](https://github.com/tangxiaoyi97/vitepress-allyouneed)
```

效果:`/guide/` 路径下的 sidebar 完全照这个写法显示,**忽略**所有 frontmatter `order` / `sidebarTitle` 等自动生成相关字段。

## 何时该用 / 不该用

**该用**:
- 想加非 vault 内的外部链接到 sidebar
- 想完全自定义顺序而不想给每个文件加 `order`
- 想要更花哨的标题(emoji / 分隔符 / 等)
- 想跨子目录引用做"flat 列表"

**不该用**:
- 简单改一两个排序 → 用 frontmatter `order` 更快
- 改一个文件标题 → 用 frontmatter `sidebarTitle` 更快
- 整站统一规则 → 用 config 里的 `sidebarAuto.*`
