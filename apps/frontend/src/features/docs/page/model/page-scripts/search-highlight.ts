import { highlightRanges, takeSearchHighlight } from "@/lib/search-highlight"

// The words a search found, highlighted in the page it opened, around
// the section the search linked to.

/** Name of the highlight that marks the searched words (`::highlight()`). */
const SEARCH_HIGHLIGHT = "search-match"

/** The level of a section heading the reader links to, `null` for others. */
function headingLevel(element: Element): number | null {
  if (element.tagName === "H2") return 2
  if (element.tagName === "H3") return 3
  return null
}

/**
 * Where the searched words are highlighted: from the heading `id` names up
 * to the next heading of the same or a higher level, or the whole body.
 */
function highlightScope(body: Element, id: string): Range {
  const range = document.createRange()
  range.selectNodeContents(body)
  const heading = id === "" ? null : document.getElementById(id)
  if (heading === null || !body.contains(heading)) return range
  const level = headingLevel(heading)
  if (level === null) return range
  range.setStartBefore(heading)
  const headings = [...body.querySelectorAll("h2, h3")]
  const after = headings.slice(headings.indexOf(heading) + 1)
  const next = after.find((other) => {
    const otherLevel = headingLevel(other)
    return otherLevel !== null && otherLevel <= level
  })
  if (next !== undefined) range.setEndBefore(next)
  return range
}

/** The ranges of the words in `scope` that start with one of `terms`. */
function matchRanges(scope: Range, terms: readonly string[]): Range[] {
  const ranges: Range[] = []
  const walker = document.createTreeWalker(
    scope.commonAncestorContainer,
    NodeFilter.SHOW_TEXT
  )
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (!scope.intersectsNode(node)) continue
    for (const { start, end } of highlightRanges(
      node.textContent ?? "",
      terms
    )) {
      const range = document.createRange()
      range.setStart(node, start)
      range.setEnd(node, end)
      ranges.push(range)
    }
  }
  return ranges
}

function hashId(): string {
  const id = location.hash.slice(1)
  try {
    return decodeURIComponent(id)
  } catch {
    return id
  }
}

/**
 * Highlights the words a navbar search found on the page it opened, in the
 * section it pointed at, without touching the markup (CSS Custom Highlight
 * API; browsers without it show none). It lasts until the page is left.
 */
export function setupSearchHighlight() {
  document.addEventListener("astro:page-load", () => {
    const terms = takeSearchHighlight(location.pathname + location.hash)
    const body = document.querySelector(".typeset-docs")
    if (terms.length === 0 || body === null) return
    if (typeof CSS === "undefined" || !("highlights" in CSS)) return
    const ranges = matchRanges(highlightScope(body, hashId()), terms)
    if (ranges.length > 0)
      CSS.highlights.set(SEARCH_HIGHLIGHT, new Highlight(...ranges))
  })
  document.addEventListener("astro:before-swap", () => {
    if (typeof CSS !== "undefined" && "highlights" in CSS)
      CSS.highlights.delete(SEARCH_HIGHLIGHT)
  })
}
