import { foldText } from "@/lib/fold-text"

// Hands the searched words from the navbar search to the page it opens, so
// the page can highlight them once: the dialog stores them for the address
// it navigates to, and the page takes them back on load. A reload, a link or
// going back finds nothing stored, so nothing is highlighted.

const STORAGE_KEY = "search-highlight"

const WORD = /[\p{L}\p{N}\p{M}]+/gu

/** A matched word, as offsets into a text. */
export interface HighlightRange {
  start: number
  end: number
}

/** The words of `search`, folded: what the opened page highlights. */
export function searchTerms(search: string): string[] {
  return (search.match(WORD) ?? []).map(foldText)
}

/**
 * The words of `text` that start with one of `terms` (already folded), case
 * and accents aside.
 */
export function highlightRanges(
  text: string,
  terms: readonly string[]
): HighlightRange[] {
  if (terms.length === 0) return []
  const ranges: HighlightRange[] = []
  for (const match of text.matchAll(WORD)) {
    const word = foldText(match[0])
    if (terms.some((term) => word.startsWith(term)))
      ranges.push({ start: match.index, end: match.index + match[0].length })
  }
  return ranges
}

/** An address as the browser may show it, decoded so both sides compare. */
function addressKey(href: string): string {
  try {
    return decodeURIComponent(href)
  } catch {
    return href
  }
}

/** Stores `terms` for the page at `href` to highlight when it opens. */
export function rememberSearchHighlight(href: string, terms: string[]) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ href: addressKey(href), terms })
    )
  } catch {
    // Without storage the page just opens without highlights.
  }
}

/**
 * The terms stored for `href` (the opened page's path and hash), removing
 * whatever was stored either way; empty when they were for another page.
 */
export function takeSearchHighlight(href: string): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null) return []
    if (!("href" in parsed) || parsed.href !== addressKey(href)) return []
    if (!("terms" in parsed) || !Array.isArray(parsed.terms)) return []
    return parsed.terms.filter(
      (term): term is string => typeof term === "string"
    )
  } catch {
    return []
  }
}
