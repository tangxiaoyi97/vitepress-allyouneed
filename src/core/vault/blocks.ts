/** Collect Obsidian `^block-id` source ranges for linking and transclusion. */

import MarkdownIt from 'markdown-it'
import type Token from 'markdown-it/lib/token.mjs'
import type { BlockEntry } from '../types.js'
import { stripNonContentMarkdown } from '../markdown-content.js'

const parser = new MarkdownIt({ html: true })
const BLOCK_ID_RE = /(?:^|\s)\^([A-Za-z0-9_-]+)\s*$/
const STANDALONE_RE = /^\^([A-Za-z0-9_-]+)$/

export function collectBlockIds(content: string): Map<string, BlockEntry> {
  const lines = content.split(/\r?\n/)
  const scanLines = stripNonContentMarkdown(content).split(/\r?\n/)
  const tokens = parser.parse(content, {})
  const blocks = new Map<string, BlockEntry>()

  for (let markerLine = 0; markerLine < lines.length; markerLine += 1) {
    const line = lines[markerLine]!
    const marker = BLOCK_ID_RE.exec(scanLines[markerLine] ?? '')
    if (!marker) continue
    const id = marker[1]!
    if (blocks.has(id)) continue

    const structuralText = stripBlockquotePrefix(line).trim()
    const standalone = STANDALONE_RE.test(structuralText)
    const range = locateBlockRange(tokens, lines, markerLine, standalone)
    const endLine = standalone ? Math.min(range.endLine, markerLine) : range.endLine
    const source = lines.slice(range.startLine, endLine).join('\n').trimEnd()
    if (!source) continue

    blocks.set(id, {
      id,
      markerLine,
      startLine: range.startLine,
      endLine,
      kind: range.kind,
      content: source,
    })
  }

  return blocks
}

interface BlockRange {
  startLine: number
  endLine: number
  kind: BlockEntry['kind']
}

function locateBlockRange(
  tokens: Token[],
  lines: string[],
  markerLine: number,
  standalone: boolean,
): BlockRange {
  const containing = mappedOpenTokens(tokens).filter(({ token }) => {
    const map = token.map
    if (!map || map[0] > markerLine || markerLine >= map[1]) return false
    // A standalone marker is parsed as its own paragraph. It describes the
    // previous structural block, never that empty marker paragraph itself.
    if (
      standalone &&
      map[0] === markerLine &&
      map[1] === markerLine + 1 &&
      (token.type === 'paragraph_open' || token.type === 'heading_open')
    ) {
      return false
    }
    return true
  })

  if (containing.length > 0) {
    const chosen = containing.sort((a, b) =>
      containerPriority(b.token.type, standalone) -
        containerPriority(a.token.type, standalone),
    )[0]!
    const [startLine, endLine] = chosen.token.map!
    return { startLine, endLine, kind: tokenKind(chosen.token.type) }
  }

  if (standalone) {
    const previous = mappedOpenTokens(tokens)
      .filter(({ token }) => token.map && token.map[1] <= markerLine)
      .filter(({ token }) => onlyBlankLines(lines, token.map![1], markerLine))
      .sort((a, b) => {
        const endDiff = b.token.map![1] - a.token.map![1]
        if (endDiff !== 0) return endDiff
        return containerPriority(b.token.type, true) -
          containerPriority(a.token.type, true)
      })[0]
    if (previous?.token.map) {
      return {
        startLine: previous.token.map[0],
        endLine: previous.token.map[1],
        kind: tokenKind(previous.token.type),
      }
    }
  }

  return { startLine: markerLine, endLine: markerLine + 1, kind: 'paragraph' }
}

function mappedOpenTokens(tokens: Token[]): Array<{ token: Token }> {
  return tokens
    .filter((token) => token.nesting === 1 && token.map)
    .filter((token) => [
      'blockquote_open',
      'bullet_list_open',
      'ordered_list_open',
      'list_item_open',
      'table_open',
      'paragraph_open',
      'heading_open',
    ].includes(token.type))
    .map((token) => ({ token }))
}

function containerPriority(type: string, standalone: boolean): number {
  if (type === 'blockquote_open') return 70
  if (type === 'table_open') return 65
  if (standalone && /^(?:bullet|ordered)_list_open$/.test(type)) return 60
  if (type === 'list_item_open') return 55
  if (/^(?:bullet|ordered)_list_open$/.test(type)) return 50
  if (type === 'heading_open') return 40
  if (type === 'paragraph_open') return 30
  return 0
}

function tokenKind(type: string): BlockEntry['kind'] {
  if (type === 'blockquote_open') return 'quote'
  if (type === 'table_open') return 'table'
  if (type === 'list_item_open') return 'list-item'
  if (/^(?:bullet|ordered)_list_open$/.test(type)) return 'list'
  if (type === 'heading_open') return 'heading'
  return 'paragraph'
}

function stripBlockquotePrefix(line: string): string {
  let output = line
  while (/^\s*>\s?/.test(output)) output = output.replace(/^\s*>\s?/, '')
  return output
}

function onlyBlankLines(lines: string[], start: number, end: number): boolean {
  for (let line = start; line < end; line += 1) {
    if (lines[line]?.trim()) return false
  }
  return true
}
