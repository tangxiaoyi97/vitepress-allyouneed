/** Official-style Obsidian body tag parsing and canonicalisation. */

/**
 * Letters/marks/numbers, `_-/`, emoji presentation characters and ZWJ.
 * Validation separately rejects tags made entirely from Unicode digits.
 */
export const DEFAULT_INLINE_TAG_PATTERN =
  /^#([\p{L}\p{M}\p{N}_/\-\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\u200D\uFE0F]+)/u

export function normalizeTag(tag: string): string {
  return tag.trim().replace(/^#/, '').toLowerCase()
}

/** Preserve author-facing spelling while removing only syntax/whitespace. */
export function displayTag(tag: string): string {
  return tag.trim().replace(/^#/, '')
}

/** Obsidian requires at least one non-numeric character. */
export function isValidTag(tag: string): boolean {
  const normalized = normalizeTag(tag)
  return normalized.length > 0 && Array.from(normalized).some(
    (character) => !/^\p{N}$/u.test(character),
  )
}

export function isValidTagBoundary(character: string | undefined): boolean {
  if (character === undefined) return true
  if (/\s/u.test(character)) return true
  return '([{,;。,;'.includes(character)
}

export function matchInlineTag(
  source: string,
  pattern: RegExp = DEFAULT_INLINE_TAG_PATTERN,
): { raw: string; tag: string; length: number } | undefined {
  const flags = pattern.flags.replace(/[gy]/g, '')
  const matcher = new RegExp(pattern.source, flags)
  const match = matcher.exec(source)
  if (!match || match.index !== 0 || !match[1]) return undefined
  const tag = normalizeTag(match[1])
  if (!isValidTag(tag)) return undefined
  return { raw: match[1], tag, length: match[0].length }
}

/** Scan already-cleaned Markdown content using the same rule as rendering. */
export function findInlineTags(
  source: string,
  pattern: RegExp = DEFAULT_INLINE_TAG_PATTERN,
): string[] {
  const found: string[] = []
  for (let i = 0; i < source.length; i += 1) {
    if (source.charCodeAt(i) !== 0x23 /* # */) continue
    if (!isValidTagBoundary(i === 0 ? undefined : source[i - 1])) continue
    const match = matchInlineTag(source.slice(i), pattern)
    if (!match) continue
    found.push(match.tag)
    i += match.length - 1
  }
  return found
}

/** Scan canonical keys together with their original author-facing spelling. */
export function findInlineTagMatches(
  source: string,
  pattern: RegExp = DEFAULT_INLINE_TAG_PATTERN,
): Array<{ tag: string; display: string }> {
  const found: Array<{ tag: string; display: string }> = []
  for (let i = 0; i < source.length; i += 1) {
    if (source.charCodeAt(i) !== 0x23 /* # */) continue
    if (!isValidTagBoundary(i === 0 ? undefined : source[i - 1])) continue
    const match = matchInlineTag(source.slice(i), pattern)
    if (!match) continue
    found.push({ tag: match.tag, display: displayTag(match.raw) })
    i += match.length - 1
  }
  return found
}
