/**
 * 自定义 VitePress 主题入口。
 *
 * 这里只做一件事:在默认主题之上加 vitepress-allyouneed 的默认样式表。
 * 不需要这个文件时,VitePress 用内置 DefaultTheme,不会有 wikilink/transclusion 样式。
 */

import DefaultTheme from 'vitepress/theme'
import 'vitepress-allyouneed/style.css'

export default DefaultTheme
