/** Shared source cleanup for scanners that inspect rendered Markdown content. */

import MarkdownIt from 'markdown-it'
import type Token from 'markdown-it/lib/token.mjs'
import type { FileEntry } from './types.js'
import { registerFootnoteDefinitionBlocks } from '../modules/footnotes/rule.js'

/** `[[...]]` / `![[...]]`, excluding line breaks. Create a fresh RegExp per scan. */
export const WIKILINK_SOURCE = /(!?)\[\[([^\]\n]+)\]\]/g

const blockParser = new MarkdownIt({ html: true })
registerFootnoteDefinitionBlocks(blockParser)

export interface MarkdownContentAnalysis {
  /** Block tokens shared by structural scanners such as block-ID collection. */
  tokens: Token[]
  /** Source with non-content regions blanked while preserving offsets. */
  cleaned: string
}

interface CachedMarkdownContentAnalysis extends MarkdownContentAnalysis {
  source: string
}

// FileEntry is intentionally kept unchanged: it is a public type and is also
// serialized by user integrations. A WeakMap gives all core consumers the same
// analysis without leaking implementation details or retaining removed HMR
// entries.
const analysisByFile = new WeakMap<FileEntry, CachedMarkdownContentAnalysis>()

/** Parse a Markdown body once and derive the shared scanner representation. */
export function analyzeMarkdownContent(src: string): MarkdownContentAnalysis {
  const tokens = blockParser.parse(src, {})
  return {
    tokens,
    cleaned: stripNonContentMarkdown(src, tokens),
  }
}

/** Associate an ingest-time analysis with its immutable FileEntry snapshot. */
export function cacheMarkdownContentAnalysis(
  file: FileEntry,
  analysis: MarkdownContentAnalysis,
): void {
  analysisByFile.set(file, { ...analysis, source: file.content })
}

/** Return scan-safe source, re-analysing only if a caller mutated the entry. */
export function getScannableMarkdown(file: FileEntry): string {
  const cached = analysisByFile.get(file)
  if (cached?.source === file.content) return cached.cleaned

  const analysis = analyzeMarkdownContent(file.content)
  cacheMarkdownContentAnalysis(file, analysis)
  return analysis.cleaned
}

/**
 * Blank fenced/inline code, HTML comments and Obsidian comments while
 * preserving newlines and string length. Dead-link, graph and body-tag scans
 * therefore agree about which source regions are content.
 */
export function stripNonContentMarkdown(src: string, tokens?: Token[]): string {
  let out = stripIndentedCodeBlocks(src, tokens)
  out = stripFencedBlocks(out)
    .replace(/<!--[\s\S]*?-->/g, (match) => blankExceptNewlines(match))
    .replace(/%%[\s\S]*?%%/g, (match) => blankExceptNewlines(match))

  const chars = out.split('')
  let i = 0
  while (i < out.length) {
    if (out.charCodeAt(i) !== 0x60 /* ` */) {
      i += 1
      continue
    }
    let width = 1
    while (out.charCodeAt(i + width) === 0x60) width += 1
    let j = i + width
    let close = -1
    while (j < out.length) {
      if (out.charCodeAt(j) !== 0x60) {
        j += 1
        continue
      }
      let run = 1
      while (out.charCodeAt(j + run) === 0x60) run += 1
      if (run === width) {
        close = j
        break
      }
      j += run
    }
    if (close < 0) {
      i += width
      continue
    }
    for (let k = i; k < close + width; k += 1) {
      if (chars[k] !== '\n') chars[k] = ' '
    }
    i = close + width
  }
  return chars.join('')
}

/**
 * Blank CommonMark indented code blocks without mistaking nested list content
 * for code. Markdown-it already owns that block-level distinction, and its
 * token line maps let the scanners preserve both source length and line count.
 */
function stripIndentedCodeBlocks(src: string, tokens?: Token[]): string {
  const parsed = tokens ?? blockParser.parse(src, {})
  const ranges = parsed
    .filter((token) => token.type === 'code_block' && token.map)
    .map((token) => token.map as [number, number])
  for (const token of parsed) {
    if (token.type !== 'footnote_def') continue
    const meta = token.meta as {
      scanContent?: string
      sourceLines?: number[]
    } | null
    if (!meta?.scanContent || !meta.sourceLines) continue
    const nestedCode = blockParser
      .parse(meta.scanContent, {})
      .filter((child) => child.type === 'code_block' && child.map)
    for (const child of nestedCode) {
      const [start, end] = child.map!
      for (let line = start; line < end; line += 1) {
        const sourceLine = meta.sourceLines[line]
        if (sourceLine !== undefined) ranges.push([sourceLine, sourceLine + 1])
      }
    }
  }
  if (ranges.length === 0) return src

  const lineStarts = [0]
  for (let index = 0; index < src.length; index += 1) {
    if (src.charCodeAt(index) === 0x0a /* \n */) lineStarts.push(index + 1)
  }
  const chars = src.split('')
  for (const [startLine, endLine] of ranges) {
    const start = lineStarts[startLine] ?? src.length
    const end = lineStarts[endLine] ?? src.length
    for (let index = start; index < end; index += 1) {
      if (chars[index] !== '\n') chars[index] = ' '
    }
  }
  return chars.join('')
}

function stripFencedBlocks(src: string): string {
  let output = ''
  let offset = 0
  let fenceChar = ''
  let fenceLength = 0
  let fenceBuffer = ''

  while (offset < src.length) {
    const newline = src.indexOf('\n', offset)
    const end = newline < 0 ? src.length : newline + 1
    const line = src.slice(offset, end)
    const content = line.endsWith('\n')
      ? line.slice(0, -1).replace(/\r$/, '')
      : line

    if (!fenceChar) {
      const opening = /^[ \t]{0,3}(`{3,}|~{3,})/.exec(content)
      if (opening) {
        fenceChar = opening[1]![0]!
        fenceLength = opening[1]!.length
        fenceBuffer = line
      } else {
        output += line
      }
    } else {
      const closing = new RegExp(
        `^[ \\t]{0,3}${fenceChar === '`' ? '`' : '~'}{${fenceLength},}[ \\t]*$`,
      ).test(content)
      fenceBuffer += line
      if (closing) {
        output += blankExceptNewlines(fenceBuffer)
        fenceChar = ''
        fenceLength = 0
        fenceBuffer = ''
      }
    }
    offset = end
  }

  // An unclosed fence is left intact for compatibility with the legacy
  // scanner's recovery behaviour and, importantly, without backtracking.
  return output + fenceBuffer
}

function blankExceptNewlines(value: string): string {
  return value.replace(/[^\n]/g, ' ')
}
