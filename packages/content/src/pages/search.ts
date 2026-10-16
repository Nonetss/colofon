import MiniSearch, { type SearchResult } from "minisearch"
import type { NavNode } from "#pages/nav"
import {
  foldTerm,
  type SearchSection,
  type SearchToken,
  sectionsOf,
  tokensOf,
  wordsOf,
} from "#pages/search-text"
import type { Site } from "#pages/site"

// Full-text search over the pages a site's navigation lists (the home, its
// pages and sections, the catalog type pages; never an entity page). Each
// page is one document with weighted fields, matched with every word of the
// query, by prefix, and with one typo in words of five letters or more.

/** The fields of a page the search matches, by weight. */
const BOOST = { title: 8, headings: 4, meta: 2, trail: 2, body: 1 }

type SearchField = keyof typeof BOOST

const FIELDS: SearchField[] = ["title", "headings", "meta", "trail", "body"]

/** A word found in one of these fields needs no excerpt to explain it. */
const HEADER_FIELDS = new Set<string>(["title", "meta", "trail"])

/** Shortest word that may match with a typo. */
const FUZZY_MIN_LENGTH = 5

/** Characters of an excerpt, ellipses aside, and of it before the match. */
const EXCERPT_LENGTH = 160
const EXCERPT_LEAD = 50
const ELLIPSIS = "…"

type SearchDocument = {
  id: number
  path: string
  title: string
  description: string
  trail: string[]
  fields: Record<SearchField, string>
  sections: SearchSection[]
}

/** A site's pages, indexed for `searchSite`. */
export type SiteSearch = {
  index: MiniSearch<SearchDocument>
  documents: ReadonlyMap<number, SearchDocument>
}

/** A matched word of an excerpt, as offsets into its text. */
export type SearchHighlight = { start: number; end: number }

/** The text around a match, with the matched words. */
export type SearchExcerpt = { text: string; highlights: SearchHighlight[] }

/** A page that matches a query. */
export type SearchHit = {
  path: string
  title: string
  description: string
  /** The groups and sections above the page, outermost first. */
  trail: string[]
  /** Id of the heading of the section that holds the match, if any. */
  anchor: string | null
  /** Set when some word is found only in the page's headings or body. */
  excerpt: SearchExcerpt | null
  /**
   * The query's words as typed (split at spaces, folded): the page holds
   * every one, so a caller filtering locally can match on them.
   */
  terms: string[]
  score: number
}

/** Indexes the pages of `site`. */
export function createSiteSearch(site: Site): SiteSearch {
  const documents = documentsOf(site)
  const index = new MiniSearch<SearchDocument>({
    fields: FIELDS,
    idField: "id",
    extractField: (document, field) => fieldOf(document, field),
    tokenize: wordsOf,
    processTerm: foldTerm,
  })
  index.addAll(documents)
  return {
    index,
    documents: new Map(documents.map((document) => [document.id, document])),
  }
}

/**
 * The pages holding every word of `query`, most relevant first, at most
 * `limit`; ties go by title, then by path.
 */
export function searchSite(
  search: SiteSearch,
  query: string,
  limit: number
): SearchHit[] {
  const terms = wordsOf(query).map(foldTerm)
  if (terms.length === 0) return []
  const typed = query
    .split(/\s+/)
    .filter((word) => word !== "")
    .map(foldTerm)
  const results = search.index.search(query, {
    boost: BOOST,
    prefix: true,
    fuzzy: fuzzinessOf,
    weights: { prefix: 0.5, fuzzy: 0.25 },
    combineWith: "AND",
  })
  const hits: SearchHit[] = []
  for (const result of results) {
    const document = search.documents.get(result.id)
    if (document === undefined) continue
    hits.push({ ...hitOf(document, result, terms), terms: typed })
  }
  return hits.sort(compareHits).slice(0, limit)
}

/** Orders hits by score, then title, then path. */
export function compareHits(
  a: Pick<SearchHit, "score" | "title" | "path">,
  b: Pick<SearchHit, "score" | "title" | "path">
): number {
  if (a.score !== b.score) return b.score - a.score
  const byTitle = a.title.localeCompare(b.title, "es")
  if (byTitle !== 0) return byTitle
  return a.path.localeCompare(b.path)
}

function fuzzinessOf(term: string): number | false {
  if (term.length < FUZZY_MIN_LENGTH) return false
  return 1
}

/** What MiniSearch reads of a document: its id or a searched field. */
function fieldOf(document: SearchDocument, field: string): string | number {
  if (field === "id") return document.id
  for (const name of FIELDS) if (name === field) return document.fields[name]
  return ""
}

function documentsOf(site: Site): SearchDocument[] {
  const documents: SearchDocument[] = []
  const add = (
    entry: { path: string; title: string; description: string },
    trail: string[]
  ) => {
    const page = site.pages.get(entry.path)
    const sections = sectionsOf(page?.tree ?? null)
    const fields = page?.header.campos ?? {}
    documents.push({
      id: documents.length,
      path: entry.path,
      title: entry.title,
      description: entry.description,
      trail,
      sections,
      fields: {
        title: entry.title,
        headings: sections.map((section) => section.heading).join(" "),
        meta: [entry.description, ...valueTexts(fields)].join(" "),
        trail: trail.join(" "),
        body: sections.map((section) => section.text).join(" "),
      },
    })
  }
  const visit = (nodes: readonly NavNode[], trail: string[]) => {
    for (const node of nodes) {
      if (node.kind === "group") {
        visit(node.children, [...trail, node.title])
        continue
      }
      add(node, trail)
      if (node.kind === "section") visit(node.children, [...trail, node.title])
    }
  }
  add(site.home, [])
  visit(site.nav, [])
  return documents
}

/** The text of a page's header field values, nested lists included. */
function valueTexts(value: unknown): string[] {
  if (typeof value === "string") return [value]
  if (typeof value === "number" || typeof value === "boolean")
    return [String(value)]
  if (Array.isArray(value)) return value.flatMap(valueTexts)
  if (typeof value === "object" && value !== null)
    return Object.values(value).flatMap(valueTexts)
  return []
}

function hitOf(
  document: SearchDocument,
  result: SearchResult,
  terms: string[]
): Omit<SearchHit, "terms"> {
  const base = {
    path: document.path,
    title: document.title,
    description: document.description,
    trail: document.trail,
    score: result.score,
  }
  const found = foundTerms(result)
  const needsExcerpt = terms.some(
    (term) => !inHeaderFields(term, result, found)
  )
  if (!needsExcerpt) return { ...base, anchor: null, excerpt: null }
  const section = bestSection(document.sections, terms, found)
  if (section === undefined) return { ...base, anchor: null, excerpt: null }
  return {
    ...base,
    anchor: section.anchor,
    excerpt: excerptOf(section, found),
  }
}

/** The page's words the query matched: exactly, by prefix or with a typo. */
function foundTerms(result: SearchResult): Set<string> {
  return new Set(Object.keys(result.match))
}

/** Whether the query's `term` matched a page word in a header field. */
function inHeaderFields(
  term: string,
  result: SearchResult,
  found: ReadonlySet<string>
): boolean {
  for (const word of found) {
    if (!matchesTerm(term, word)) continue
    const fields = result.match[word] ?? []
    if (fields.some((field) => HEADER_FIELDS.has(field))) return true
  }
  return false
}

/** Whether the page word `word` is what the query's `term` matches. */
function matchesTerm(term: string, word: string): boolean {
  if (word.startsWith(term)) return true
  if (fuzzinessOf(term) === false) return false
  return withinOneEdit(term, word)
}

/** Whether `a` becomes `b` by adding, removing or changing one letter. */
function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1)
  if (a.length > b.length) return a.slice(i + 1) === b.slice(i)
  return a.slice(i) === b.slice(i + 1)
}

/**
 * The section holding the most of the query's terms, the first on a tie;
 * `undefined` when none holds any.
 */
function bestSection(
  sections: readonly SearchSection[],
  terms: readonly string[],
  found: ReadonlySet<string>
): SearchSection | undefined {
  let best: SearchSection | undefined
  let bestCount = 0
  for (const section of sections) {
    const words = [
      ...tokensOf(section.heading),
      ...tokensOf(section.text),
    ].filter((token) => found.has(token.term))
    const count = terms.filter((term) =>
      words.some((token) => matchesTerm(term, token.term))
    ).length
    if (count > bestCount) {
      best = section
      bestCount = count
    }
  }
  return best
}

/** The text of `section` around its first found word, or its heading. */
function excerptOf(
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
