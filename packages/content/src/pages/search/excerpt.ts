import {
  type SearchSection,
  type SearchToken,
  tokensOf,
} from "#pages/search/text"

// The excerpt a hit shows: the text of a section around its first found
// word, cut at word boundaries, with the found words highlighted.

/** Characters of an excerpt, ellipses aside, and of it before the match. */
const EXCERPT_LENGTH = 160
const EXCERPT_LEAD = 50
const ELLIPSIS = "…"
/** A matched word of an excerpt, as offsets into its text. */
export type SearchHighlight = { start: number; end: number }

/** The text around a match, with the matched words. */
export type SearchExcerpt = { text: string; highlights: SearchHighlight[] }

/** The text of `section` around its first found word, or its heading. */
export function excerptOf(
  section: SearchSection,
  found: ReadonlySet<string>
): SearchExcerpt {
  const tokens = tokensOf(section.text)
  const first = tokens.find((token) => found.has(token.term))
  if (first === undefined) {
    const headingTokens = tokensOf(section.heading)
    return {
      text: section.heading,
      highlights: highlightsOf(headingTokens, found, 0, 0),
    }
  }
  return windowAround(section.text, tokens, first, found)
}

function windowAround(
  text: string,
  tokens: readonly SearchToken[],
  first: SearchToken,
  found: ReadonlySet<string>
): SearchExcerpt {
  const start = windowStart(text, first)
  const end = windowEnd(text, start, first)
  const prefix = start > 0 ? ELLIPSIS : ""
  const suffix = end < text.length ? ELLIPSIS : ""
  const inside = tokens.filter(
    (token) => token.start >= start && token.end <= end
  )
  return {
    text: `${prefix}${text.slice(start, end)}${suffix}`,
    highlights: highlightsOf(inside, found, start, prefix.length),
  }
}

/** Where the excerpt starts: a word boundary a little before the match. */
function windowStart(text: string, first: SearchToken): number {
  if (first.start <= EXCERPT_LEAD) return 0
  const space = text.indexOf(" ", first.start - EXCERPT_LEAD)
  if (space === -1 || space >= first.start) return first.start
  return space + 1
}

/** Where the excerpt ends: the last word boundary that fits, past the match. */
function windowEnd(text: string, start: number, first: SearchToken): number {
  const limit = start + EXCERPT_LENGTH
  if (limit >= text.length) return text.length
  const space = text.lastIndexOf(" ", limit)
  if (space <= first.end) return Math.max(limit, first.end)
  return space
}

function highlightsOf(
  tokens: readonly SearchToken[],
  found: ReadonlySet<string>,
  start: number,
  offset: number
): SearchHighlight[] {
  return tokens
    .filter((token) => found.has(token.term))
    .map((token) => ({
      start: token.start - start + offset,
      end: token.end - start + offset,
    }))
}
