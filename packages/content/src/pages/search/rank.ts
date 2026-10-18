import type { SearchResult } from "minisearch"
import { type SearchSection, tokensOf } from "#pages/search/text"

// How search results are ordered and matched: hits by score and title,
// partial answers by how many words they lack, entities exact first, and
// which words of a page a query term matches (by prefix, or with one typo).

/** What ordering a page hit looks at. */
type RankedHit = {
  score: number
  title: string
  path: string
  repository: string
}

/** What ordering an entity hit looks at. */
type RankedEntity = {
  exact: boolean
  score: number
  label: string
  type: { id: string }
  repository: string
}

/** A word found in one of these fields needs no excerpt to explain it. */
const HEADER_FIELDS = new Set<string>(["title", "meta", "trail"])
/** Shortest word that may match with a typo. */
const FUZZY_MIN_LENGTH = 5
/** Orders hits by score, then title, then repository, then path. */
function compareHits(a: RankedHit, b: RankedHit): number {
  if (a.score !== b.score) return b.score - a.score
  const byTitle = a.title.localeCompare(b.title, "es")
  if (byTitle !== 0) return byTitle
  const byRepository = a.repository.localeCompare(b.repository)
  if (byRepository !== 0) return byRepository
  return a.path.localeCompare(b.path)
}

/**
 * The pages holding every word or, for a query of several words that none
 * holds, the pages holding some of them as a partial answer.
 */
export function pageResults(
  run: (combineWith: "AND" | "OR") => SearchResult[],
  termCount: number
): { results: SearchResult[]; partial: boolean } {
  const every = run("AND")
  if (every.length > 0 || termCount < 2)
    return { results: every, partial: false }
  const some = run("OR")
  return { results: some, partial: some.length > 0 }
}

/** Hits lacking fewer words first, then as `compareHits`. */
export function comparePartialHits(
  a: RankedHit & { missing: readonly string[] },
  b: RankedHit & { missing: readonly string[] }
): number {
  if (a.missing.length !== b.missing.length)
    return a.missing.length - b.missing.length
  return compareHits(a, b)
}

/** Exact entities first, then score, label, type and repository. */
export function compareEntityHits(a: RankedEntity, b: RankedEntity): number {
  if (a.exact !== b.exact) return Number(b.exact) - Number(a.exact)
  if (a.score !== b.score) return b.score - a.score
  const byLabel = a.label.localeCompare(b.label, "es")
  if (byLabel !== 0) return byLabel
  const byType = a.type.id.localeCompare(b.type.id)
  if (byType !== 0) return byType
  return a.repository.localeCompare(b.repository)
}

/** The query's words that matched nothing of the document. */
export function missingTerms(terms: readonly string[], result: SearchResult) {
  const matched = new Set(result.queryTerms)
  return terms.filter((term) => !matched.has(term))
}

export function fuzzinessOf(term: string): number | false {
  if (term.length < FUZZY_MIN_LENGTH) return false
  return 1
}

/** The page's words the query matched: exactly, by prefix or with a typo. */
export function foundTerms(result: SearchResult): Set<string> {
  return new Set(Object.keys(result.match))
}

/** Whether the query's `term` matched a page word in a header field. */
export function inHeaderFields(
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
 * The sections holding any of the query's terms, those holding the most
 * first, in page order on a tie.
 */
export function rankSections(
  sections: readonly SearchSection[],
  terms: readonly string[],
  found: ReadonlySet<string>
): SearchSection[] {
  const counted: { section: SearchSection; count: number }[] = []
  for (const section of sections) {
    const words = [
      ...tokensOf(section.heading),
      ...tokensOf(section.text),
    ].filter((token) => found.has(token.term))
    const count = terms.filter((term) =>
      words.some((token) => matchesTerm(term, token.term))
    ).length
    if (count > 0) counted.push({ section, count })
  }
  return counted.sort((a, b) => b.count - a.count).map((entry) => entry.section)
}
