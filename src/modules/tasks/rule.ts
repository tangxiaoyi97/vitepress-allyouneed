/** Render Obsidian task markers (`[ ]`, `[x]`, `[?]`, …) in list items. */

import type MarkdownIt from 'markdown-it'
import type StateCore from 'markdown-it/lib/rules_core/state_core.mjs'
import type Token from 'markdown-it/lib/token.mjs'
import { escapeHtml } from '../../utils/escape.js'

const TASK_MARKER = /^\[([^\]\n])\](?:[ \t]+|$)/u

export function registerTasks(md: MarkdownIt): void {
  md.core.ruler.after('inline', 'allyouneed_tasks', transformTasks)
}

function transformTasks(state: StateCore): void {
  const listStack: Token[] = []
  const itemStack: Token[] = []
  const inspectedItems = new WeakSet<Token>()

  for (const token of state.tokens) {
    if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') {
      listStack.push(token)
      continue
    }
    if (token.type === 'bullet_list_close' || token.type === 'ordered_list_close') {
      listStack.pop()
      continue
    }
    if (token.type === 'list_item_open') {
      itemStack.push(token)
      continue
    }
    if (token.type === 'list_item_close') {
      itemStack.pop()
      continue
    }
    if (token.type !== 'inline' || itemStack.length === 0) continue

    const item = itemStack[itemStack.length - 1]!
    // Only the first inline block belongs to the task marker position. A later
    // paragraph beginning with `[?]` is ordinary content in the same item.
    if (inspectedItems.has(item)) continue
    inspectedItems.add(item)

    const match = TASK_MARKER.exec(token.content)
    const first = token.children?.[0]
    if (!match || !first || first.type !== 'text') continue

    const markerLength = match[0].length
    // The unmatched bracket marker is emitted as the first text token by
    // markdown-it. Guard its content as well so formatted task text remains
    // untouched and third-party inline rules cannot be corrupted.
    if (!first.content.startsWith(match[0])) continue

    const status = match[1]!
    const checked = status !== ' '
    token.content = token.content.slice(markerLength)
    first.content = first.content.slice(markerLength)

    const checkbox = new state.Token('html_inline', '', 0)
    checkbox.content =
      `<input class="task-list-item-checkbox ayn-task-checkbox" ` +
      `type="checkbox" disabled data-task="${escapeHtml(status)}" ` +
      `aria-label="Task status ${escapeHtml(status === ' ' ? 'unchecked' : status)}"` +
      `${checked ? ' checked' : ''}>`
    token.children!.unshift(checkbox)

    const list = listStack[listStack.length - 1]
    addClass(item, 'task-list-item')
    item.attrSet('data-task', status)
    if (list) addClass(list, 'contains-task-list')
  }
}

function addClass(token: Token, value: string): void {
  const current = token.attrGet('class')
  if (current?.split(/\s+/).includes(value)) return
  token.attrSet('class', current ? `${current} ${value}` : value)
}
