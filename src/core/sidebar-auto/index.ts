/** v0.3 sidebar 自动生成模块入口 */
export {
  generateSidebar,
  generateNav,
  resolveSidebarAutoOptions,
} from './generate.js'
// v0.3.10:autoFolderIndex 已删除。曾在此处导出的 generateFolderIndexes /
// FOLDER_INDEX_SENTINEL / FolderIndexOptions 等不再可用。文件夹访问由
// folderLinkOrder + sidebar/nav/wikilink 解析处理(详见 DOCS.md "Folder Links")。
export {
  generateSidebarMaterializations,
  SIDEBAR_MATERIALIZE_SENTINEL,
} from './generate-sidebar-materialize.js'
export type {
  MaterializeMode,
  MaterializeOptions,
  MaterializeReport,
} from './generate-sidebar-materialize.js'
export type {
  SidebarItem,
  SidebarConfig,
  SidebarAutoMode,
  SidebarAutoOptions,
  ResolvedSidebarAutoOptions,
  NavItem,
} from './types.js'
