import type { ElementContent, Root, RootContent } from "hast"

// The text of a page as the search reads it: split into sections at its
// headings (the ones with an id, which the reader can link to) and into
// words that keep their place in that text, so a match can be shown and
// highlighted where it was found.

/**
 * A stretch of a page's body: the text above its first heading (no anchor),
 * or one heading and the text up to the next one.
 */
export type SearchSection = {
  /** The heading's id; `null` for the text above the first heading. */
  anchor: string | null
  heading: string
  text: string
}

/** A word of a text: where it is and its folded form. */
export type SearchToken = { start: number; end: number; term: string }

const SKIPPED_TAGS = new Set(["script", "style"])
const SECTION_TAGS = new Set(["h2", "h3"])
// Elements inside a line of text: the words around them stay joined.
const INLINE_TAGS = new Set([
  "a",
  "abbr",
  "b",
  "code",
  "del",
  "em",
  "i",
  "ins",
  "kbd",
  "mark",
  "s",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "u",
])
const WORD = /[\p{L}\p{N}\p{M}]+/gu

/** Lowercase and without diacritics, so "Configuración" is "configuracion". */
export function foldTerm(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
}

/** The words of `text`, as typed: the search indexes and queries these. */
export function wordsOf(text: string): string[] {
  return text.match(WORD) ?? []
}

/** The words of `text` with their place in it. */
export function tokensOf(text: string): SearchToken[] {
  const tokens: SearchToken[] = []
  for (const match of text.matchAll(WORD)) {
    tokens.push({
      start: match.index,
      end: match.index + match[0].length,
      term: foldTerm(match[0]),
    })
  }
  return tokens
}

type OpenSection = { anchor: string | null; heading: string; parts: string[] }

/**
 * The sections of a page's tree, in order. The text above the first heading
 * is a section only when it holds any; a page without a tree has none.
 */
export function sectionsOf(tree: Root | null): SearchSection[] {
  if (tree === null) return []
  const sections: SearchSection[] = []
  let current: OpenSection = { anchor: null, heading: "", parts: [] }

  const close = () => {
    const text = collapse(current.parts.join(""))
    if (current.anchor === null && text === "") return
    sections.push({ anchor: current.anchor, heading: current.heading, text })
  }

  const visit = (nodes: readonly (RootContent | ElementContent)[]) => {
    for (const node of nodes) {
      if (node.type === "text") {
        current.parts.push(node.value)
        continue
      }
      if (node.type !== "element" || SKIPPED_TAGS.has(node.tagName)) continue
      const anchor = node.properties.id
      if (SECTION_TAGS.has(node.tagName) && typeof anchor === "string") {
        close()
        current = { anchor, heading: textOf(node.children), parts: [] }
        continue
      }
      visit(node.children)
      if (!INLINE_TAGS.has(node.tagName)) current.parts.push(" ")
    }
  }

  visit(tree.children)
  close()
  return sections
}

/** The text of a heading's content. */
function textOf(nodes: readonly ElementContent[]): string {
  const parts: string[] = []
  const visit = (children: readonly ElementContent[]) => {
    for (const node of children) {
      if (node.type === "text") parts.push(node.value)
      if (node.type === "element") visit(node.children)
    }
  }
  visit(nodes)
  return collapse(parts.join(""))
}

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}
