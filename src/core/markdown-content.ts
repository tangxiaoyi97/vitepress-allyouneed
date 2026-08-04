/** Shared source cleanup for scanners that inspect rendered Markdown content. */

/** `[[...]]` / `![[...]]`, excluding line breaks. Create a fresh RegExp per scan. */
export const WIKILINK_SOURCE = /(!?)\[\[([^\]\n]+)\]\]/g

/**
 * Blank fenced/inline code, HTML comments and Obsidian comments while
 * preserving newlines and string length. Dead-link, graph and body-tag scans
 * therefore agree about which source regions are content.
 */
export function stripNonContentMarkdown(src: string): string {
  let out = stripFencedBlocks(src)
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
