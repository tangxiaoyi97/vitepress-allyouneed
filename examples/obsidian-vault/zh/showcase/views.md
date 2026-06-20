---
title: 三大视图
sidebarTitle: 三大视图
order: 5
tags: [showcase, views, graph]
---

# 三大视图

插件会扫描整个 vault,自动生成三个交互式视图组件,并写一份 `vault-data.json` 给前端。下面**直接嵌入真实组件**——它们读的就是这个站点自己的数据。

> [!tip] 这些是活的
> 下面的图谱、统计、标签都是实时渲染的真实组件,不是截图。试着拖拽图谱节点、点标签筛选。

## 关系图 VaultGraph

D3 力导向关系图,节点是笔记,连线是 wikilink / 转译关系。支持缩放(滚轮)、拖拽、hover 高亮邻居、点击跳转。缩小时节点名自动淡出,放大时浮现 —— 和 Obsidian 一致。

```md
<VaultGraph :max-nodes="500" />
```

<VaultGraph :max-nodes="300" />

节点大小按入度(被链接次数)变化;虚线是转译边、实线是普通 wikilink。超过 `max-nodes` 会显示降级提示以保证性能。

## 统计 VaultStats

vault 概览:笔记 / 标签 / 链接 / 资源数量,加最近更新列表。

```md
<VaultStats />
```

<VaultStats />

## 标签云 Tags

所有标签(frontmatter + 正文 `#tag`)聚合,点击筛选出带该标签的笔记。

```md
<Tags />
```

<Tags />

## 工作原理

1. 构建时扫描 vault,在 `<srcDir>/<urlPrefix>/` 生成 `graph.md` / `stats.md` / `tags.md` 三个页面;
2. 把 `vault-data.json` 写进 `public/`(节点、边、标签、统计一应俱全);
3. 三个组件全局注册,读 `vault-data.json` 渲染;
4. 这些视图页自动挂到导航(`injectInto`:nav 下拉 / sidebar 分组 / 两者)。

> [!info] 自动注入
> 本站把视图挂在右上角 **Perspectives** 入口(默认 `injectInto: 'nav'`)。你也可以让它追加到每个 sidebar 末尾。

## 相关配置

```ts
{
  views: {
    enabled: { graph: true, stats: true, tags: true },
    urlPrefix: '_perspectives_',        // 视图页所在目录;'' = 放根目录
    graphMaxNodes: 500,                 // 图谱节点上限
    injectInto: 'nav',                  // 'nav' | 'sidebar' | 'both' | 'off'
    parseInlineTags: true,
  },
}
```

回到 [[index|展示总览]],或读 [[overview|完整文档]] →
