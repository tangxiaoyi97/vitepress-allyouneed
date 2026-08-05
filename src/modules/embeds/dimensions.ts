export interface ParsedDimensions {
  width?: number
  height?: number
}

/** Parse Obsidian pixel dimensions: `N`, `NxM`, and the compatible `xM`. */
export function parseDimensionToken(
  source: string,
): ParsedDimensions | undefined {
  const token = source.trim().toLowerCase()
  if (!token) return undefined

  const pair = /^(\d*)x(\d*)$/.exec(token)
  if (pair) {
    const width = pair[1]
    const height = pair[2]
    if (!width && !height) return undefined
    return {
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
    }
  }
  if (/^\d+$/.test(token)) return { width: Number(token) }
  return undefined
}

export function parseWikiImageParts(parts: string[]): {
  altText: string
  dimensions: ParsedDimensions
  rawDimensions: string
} {
  if (parts.length === 0) {
    return { altText: '', dimensions: {}, rawDimensions: '' }
  }
  const last = parts[parts.length - 1]!
  const dimensions = parseDimensionToken(last)
  if (!dimensions) {
    return {
      altText: parts.join('|').trim(),
      dimensions: {},
      rawDimensions: '',
    }
  }
  return {
    altText: parts.slice(0, -1).join('|').trim(),
    dimensions,
    rawDimensions: last.trim(),
  }
}

/**
 * Parse Markdown image alt dimensions used by Obsidian:
 * `![alt|N](url)`, `![alt|NxM](url)`, and `![N](url)`.
 */
export function parseMarkdownImageAlt(source: string): {
  altSource: string
  dimensions: ParsedDimensions
} | undefined {
  const separator = findLastUnescapedPipe(source)
  const dimensionSource = separator < 0 ? source : source.slice(separator + 1)
  const dimensions = parseMarkdownDimensionToken(dimensionSource)
  if (!dimensions) return undefined
  return {
    altSource: separator < 0 ? '' : source.slice(0, separator).trim(),
    dimensions,
  }
}

/** Obsidian documents only width (`N`) and width-by-height (`NxM`) here. */
function parseMarkdownDimensionToken(source: string): ParsedDimensions | undefined {
  const match = /^(\d+)(?:x(\d+))?$/i.exec(source.trim())
  if (!match) return undefined
  return {
    width: Number(match[1]),
    height: match[2] === undefined ? undefined : Number(match[2]),
  }
}

function findLastUnescapedPipe(source: string): number {
  for (let index = source.length - 1; index >= 0; index -= 1) {
    if (source[index] !== '|') continue
    let slashes = 0
    for (let cursor = index - 1; cursor >= 0 && source[cursor] === '\\'; cursor -= 1) {
      slashes += 1
    }
    if (slashes % 2 === 0) return index
  }
  return -1
}
