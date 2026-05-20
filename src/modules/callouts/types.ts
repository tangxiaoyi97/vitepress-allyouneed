/**
 * Obsidian 13 种原生 callout 类型 + 别名映射。
 * 别名 → 规范名(用于 CSS class / 图标)
 */

export const CALLOUT_TYPES = {
  // Standard
  note: 'note',
  info: 'info',
  tip: 'tip',
  success: 'success',
  question: 'question',
  warning: 'warning',
  failure: 'failure',
  danger: 'danger',
  bug: 'bug',
  example: 'example',
  quote: 'quote',
  abstract: 'abstract',
  todo: 'todo',

  // Aliases (Obsidian 官方文档列出的别名)
  hint: 'tip',
  important: 'tip',
  check: 'success',
  done: 'success',
  help: 'question',
  faq: 'question',
  caution: 'warning',
  attention: 'warning',
  fail: 'failure',
  missing: 'failure',
  error: 'danger',
  cite: 'quote',
  summary: 'abstract',
  tldr: 'abstract',
} as const

export type CalloutCanonical =
  | 'note' | 'info' | 'tip' | 'success' | 'question' | 'warning'
  | 'failure' | 'danger' | 'bug' | 'example' | 'quote' | 'abstract' | 'todo'

/**
 * 把任意 raw type(可能是别名)归一化为 canonical。未知 type 退化到 'note'。
 */
export function normalizeCalloutType(raw: string): CalloutCanonical {
  const key = raw.trim().toLowerCase()
  const mapped = (CALLOUT_TYPES as Record<string, string>)[key]
  return (mapped ?? 'note') as CalloutCanonical
}

/** foldable 标记:`[!info]+` 默认开,`[!info]-` 默认关,无标记不可折叠 */
export type CalloutFoldable = 'open' | 'closed' | null

/** 解析一行 `[!type][+-]? <title>` 的结果 */
export interface CalloutHeader {
  type: CalloutCanonical
  foldable: CalloutFoldable
  /** 用户写的 title;为空时调用方应用 DEFAULT_TITLES[type] */
  title: string
}

/** 每种 type 的默认标题(用户没写自定义 title 时用)*/
export const DEFAULT_TITLES: Record<CalloutCanonical, string> = {
  note: 'Note',
  info: 'Info',
  tip: 'Tip',
  success: 'Success',
  question: 'Question',
  warning: 'Warning',
  failure: 'Failure',
  danger: 'Danger',
  bug: 'Bug',
  example: 'Example',
  quote: 'Quote',
  abstract: 'Abstract',
  todo: 'Todo',
}

/** 每种 type 的 SVG icon path(用 lucide 风,inline 渲染)*/
export const CALLOUT_ICONS: Record<CalloutCanonical, string> = {
  note:
    '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  info:
    '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  tip:
    '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  success:
    '<path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/>',
  question:
    '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  warning:
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  failure:
    '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  danger:
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  bug:
    '<path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/>',
  example:
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  quote:
    '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 .25 0 .5 0 .75.031V14c0 1-1 2-2 2s-1.5.5-1.5 1V20c0 1 .5 1 1.75 1z"/>',
  abstract:
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>',
  todo:
    '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
}
