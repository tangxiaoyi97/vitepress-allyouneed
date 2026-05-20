/** v0.3 sidebar 自动生成模块入口 */
export {
  generateSidebar,
  generateNav,
  resolveSidebarAutoOptions,
} from './generate.js'
export {
  generateFolderIndexes,
  FOLDER_INDEX_SENTINEL,
} from './generate-folder-index.js'
export type {
  FolderIndexOptions,
  FolderIndexReport,
  TemplateContext as FolderIndexTemplateContext,
} from './generate-folder-index.js'
export type {
  SidebarItem,
  SidebarConfig,
  SidebarAutoMode,
  SidebarAutoOptions,
  ResolvedSidebarAutoOptions,
  NavItem,
} from './types.js'
