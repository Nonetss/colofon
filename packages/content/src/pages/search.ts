import MiniSearch, { type SearchResult } from "minisearch"
import { entityPath } from "#contract/catalog/paths"
import type { Catalog } from "#contract/catalog/read"
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

// Full-text search over the pages the navigation of every repository lists
// (the home, its pages and sections, the catalog type pages; never an entity
// page) and over the catalog entities. One index holds every repository, so
// how rare a word is gets measured once and results of several repositories
// rank on the same terms; a search keeps the repositories it is asked for.
// Each page is one document with weighted fields, matched with every word of
// the query, by prefix, and with one typo in words of five letters or more;
// when no page holds every word, the pages holding some come back as a
// partial answer.

/** The fields of a page the search matches, by weight. */
const BOOST = { title: 8, headings: 4, meta: 2, trail: 2, body: 1 }

type SearchField = keyof typeof BOOST

const FIELDS: SearchField[] = ["title", "headings", "meta", "trail", "body"]

/** The fields of an entity the search matches, by weight. */
const ENTITY_BOOST = { key: 6, type: 2, values: 1 }

type EntityField = keyof typeof ENTITY_BOOST

const ENTITY_FIELDS: EntityField[] = ["key", "type", "values"]

/** A word found in one of these fields needs no excerpt to explain it. */
const HEADER_FIELDS = new Set<string>(["title", "meta", "trail"])

/** Shortest word that may match with a typo. */
const FUZZY_MIN_LENGTH = 5

/** Sections a hit carries besides the one its excerpt comes from. */
const EXTRA_SECTIONS = 2

/** Characters of an excerpt, ellipses aside, and of it before the match. */
const EXCERPT_LENGTH = 160
const EXCERPT_LEAD = 50
const ELLIPSIS = "…"

/** What an exact entity match ignores besides case and accents. */
const KEY_SEPARATORS = /[-_:.\s]/g

const SEARCH_OPTIONS = {
  prefix: true,
  fuzzy: fuzzinessOf,
  weights: { prefix: 0.5, fuzzy: 0.25 },
}

type SearchDocument = {
  id: number
  repository: string
  path: string
  title: string
  description: string
  trail: string[]
  fields: Record<SearchField, string>
  sections: SearchSection[]
}

type EntityDocument = {
  id: number
  repository: string
  typeId: string
  typePlural: string
  entityId: string
  label: string
  fields: Record<EntityField, string>
}

/** A matched word of an excerpt, as offsets into its text. */
export type SearchHighlight = { start: number; end: number }

/** The text around a match, with the matched words. */
export type SearchExcerpt = { text: string; highlights: SearchHighlight[] }

/** Another section of a page that holds some of the query's words. */
export type SearchSectionHit = {
  /** Id of the section's heading. */
  anchor: string
  heading: string
  excerpt: SearchExcerpt
}

/** A page that matches a query. */
export type SearchHit = {
  /** Slug of the page's repository. */
  repository: string
  path: string
  title: string
  description: string
  /** The groups and sections above the page, outermost first. */
  trail: string[]
  /** Id of the heading of the section that holds the match, if any. */
  anchor: string | null
  /** Set when some word is found only in the page's headings or body. */
  excerpt: SearchExcerpt | null
  /** Up to two more matching sections; empty without an excerpt. */
  sections: SearchSectionHit[]
  /**
   * The query's words as typed (split at spaces, folded), so a caller
   * filtering locally can match on them.
   */
  terms: string[]
  /** The query's words the page lacks; empty unless the answer is partial. */
  missing: string[]
  score: number
}

/** A catalog entity that matches a query. */
export type EntityHit = {
  repository: string
  type: { id: string; plural: string }
  id: string
  label: string
  /** The path of the entity's generated catalog page. */
  path: string
  /** Whether its id or label is the query, case, accents and separators aside. */
  exact: boolean
  score: number
}

/** What a search finds. */
export type SearchAnswer = {
  /** Whether no page holds every word, so `hits` hold some of them. */
  partial: boolean
  hits: SearchHit[]
  entities: EntityHit[]
}

export type SearchOptions = {
  /** Slugs of the repositories to search. */
  repositories: ReadonlySet<string>
  /** Most pages to return. */
  limit: number
  /** Most entities to return. */
  entityLimit: number
}

/** The pages and entities of every repository, indexed together. */
export type DocsSearch = {
  /**
   * Indexes `site` as the repository `repository`, replacing its previous
   * documents; nothing happens when `site` is the one already indexed.
   */
  update: (repository: string, site: Site) => void
  /** The pages and entities of `options.repositories` that match `query`. */
  search: (query: string, options: SearchOptions) => SearchAnswer
}

type Indexed = { site: Site; pageIds: number[]; entityIds: number[] }

/** An empty index for every repository; `update` fills it. */
export function createDocsSearch(): DocsSearch {
  const pages = new MiniSearch<SearchDocument>({
    fields: FIELDS,
    idField: "id",
    extractField: (document, field) => pageFieldOf(document, field),
    tokenize: wordsOf,
    processTerm: foldTerm,
  })
  const entities = new MiniSearch<EntityDocument>({
    fields: ENTITY_FIELDS,
    idField: "id",
    extractField: (document, field) => entityFieldOf(document, field),
    tokenize: wordsOf,
    processTerm: foldTerm,
  })
  const pageDocuments = new Map<number, SearchDocument>()
  const entityDocuments = new Map<number, EntityDocument>()
  const indexed = new Map<string, Indexed>()
  let nextId = 0
  const takeId = () => nextId++

  function update(repository: string, site: Site) {
    const previous = indexed.get(repository)
    if (previous?.site === site) return
    if (previous !== undefined) {
      pages.discardAll(previous.pageIds)
      entities.discardAll(previous.entityIds)
      for (const id of previous.pageIds) pageDocuments.delete(id)
      for (const id of previous.entityIds) entityDocuments.delete(id)
    }
    const newPages = documentsOf(repository, site, takeId)
    const newEntities = entityDocumentsOf(repository, site.catalog, takeId)
    pages.addAll(newPages)
    entities.addAll(newEntities)
    for (const document of newPages) pageDocuments.set(document.id, document)
    for (const document of newEntities)
      entityDocuments.set(document.id, document)
    indexed.set(repository, {
      site,
      pageIds: newPages.map((document) => document.id),
      entityIds: newEntities.map((document) => document.id),
    })
  }

  function search(query: string, options: SearchOptions): SearchAnswer {
    const terms = wordsOf(query).map(foldTerm)
    if (terms.length === 0) return { partial: false, hits: [], entities: [] }
    const typed = query
      .split(/\s+/)
      .filter((word) => word !== "")
      .map(foldTerm)
    const inScope = (result: SearchResult) => {
      const document = pageDocuments.get(result.id)
      if (document === undefined) return false
      return options.repositories.has(document.repository)
    }
    const run = (combineWith: "AND" | "OR") =>
      pages.search(query, {
        ...SEARCH_OPTIONS,
        boost: BOOST,
        combineWith,
        filter: inScope,
      })
    const { results, partial } = pageResults(run, terms.length)
    const hits: SearchHit[] = []
    for (const result of results) {
      const document = pageDocuments.get(result.id)
      if (document === undefined) continue
      const missing = missingTerms(terms, result)
      hits.push({ ...hitOf(document, result, terms, missing), terms: typed })
    }
    hits.sort(comparePartialHits)
    return {
      partial,
      hits: hits.slice(0, options.limit),
      entities: searchEntities(query, options).slice(0, options.entityLimit),
    }
  }

  function searchEntities(query: string, options: SearchOptions): EntityHit[] {
    const key = compactKey(query)
    const results = entities.search(query, {
      ...SEARCH_OPTIONS,
      boost: ENTITY_BOOST,
      combineWith: "AND",
      filter: (result) => {
        const document = entityDocuments.get(result.id)
        if (document === undefined) return false
        return options.repositories.has(document.repository)
      },
    })
    const hits: EntityHit[] = []
    for (const result of results) {
      const document = entityDocuments.get(result.id)
      if (document === undefined) continue
      hits.push({
        repository: document.repository,
        type: { id: document.typeId, plural: document.typePlural },
        id: document.entityId,
        label: document.label,
        path: entityPath(document.typeId, document.entityId),
        exact:
          compactKey(document.entityId) === key ||
          compactKey(document.label) === key,
        score: result.score,
      })
    }
    return hits.sort(compareEntityHits)
  }

  return { update, search }
}

/** Orders hits by score, then title, then repository, then path. */
function compareHits(
  a: Pick<SearchHit, "score" | "title" | "path" | "repository">,
  b: Pick<SearchHit, "score" | "title" | "path" | "repository">
): number {
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
function pageResults(
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
function comparePartialHits(a: SearchHit, b: SearchHit): number {
  if (a.missing.length !== b.missing.length)
    return a.missing.length - b.missing.length
  return compareHits(a, b)
}

/** Exact entities first, then score, label, type and repository. */
function compareEntityHits(a: EntityHit, b: EntityHit): number {
  if (a.exact !== b.exact) return Number(b.exact) - Number(a.exact)
  if (a.score !== b.score) return b.score - a.score
  const byLabel = a.label.localeCompare(b.label, "es")
  if (byLabel !== 0) return byLabel
  const byType = a.type.id.localeCompare(b.type.id)
  if (byType !== 0) return byType
  return a.repository.localeCompare(b.repository)
}

/** `value` folded and without separators: `DATABASE_URL` is `databaseurl`. */
function compactKey(value: string): string {
  return foldTerm(value).replace(KEY_SEPARATORS, "")
}

/** The query's words that matched nothing of the document. */
function missingTerms(terms: readonly string[], result: SearchResult) {
  const matched = new Set(result.queryTerms)
  return terms.filter((term) => !matched.has(term))
}

function fuzzinessOf(term: string): number | false {
  if (term.length < FUZZY_MIN_LENGTH) return false
  return 1
}

/** What MiniSearch reads of a page: its id or a searched field. */
function pageFieldOf(document: SearchDocument, field: string): string | number {
  if (field === "id") return document.id
  for (const name of FIELDS) if (name === field) return document.fields[name]
  return ""
}

/** What MiniSearch reads of an entity: its id or a searched field. */
function entityFieldOf(
  document: EntityDocument,
  field: string
): string | number {
  if (field === "id") return document.id
  for (const name of ENTITY_FIELDS)
    if (name === field) return document.fields[name]
  return ""
}

function documentsOf(
  repository: string,
  site: Site,
  takeId: () => number
): SearchDocument[] {
  const documents: SearchDocument[] = []
  const add = (
    entry: { path: string; title: string; description: string },
    trail: string[]
  ) => {
    const page = site.pages.get(entry.path)
    const sections = sectionsOf(page?.tree ?? null)
    const fields = page?.header.fields ?? {}
    documents.push({
      id: takeId(),
      repository,
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

function entityDocumentsOf(
  repository: string,
  catalog: Catalog,
  takeId: () => number
): EntityDocument[] {
  const documents: EntityDocument[] = []
  for (const type of catalog.values()) {
    const plural = type.definition.plural
    for (const entity of type.entities.values()) {
      documents.push({
        id: takeId(),
        repository,
        typeId: type.id,
        typePlural: plural,
        entityId: entity.id,
        label: entity.label,
        fields: {
          key: `${entity.id} ${entity.label}`,
          type: `${plural} ${type.id}`,
          values: valueTexts(entity.values).join(" "),
        },
      })
    }
  }
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
  terms: readonly string[],
  missing: string[]
): Omit<SearchHit, "terms"> {
  const base = {
    repository: document.repository,
    path: document.path,
    title: document.title,
    description: document.description,
    trail: document.trail,
    missing,
    score: result.score,
  }
  const none = { ...base, anchor: null, excerpt: null, sections: [] }
  const matched = terms.filter((term) => !missing.includes(term))
  const found = foundTerms(result)
  const needsExcerpt = matched.some(
    (term) => !inHeaderFields(term, result, found)
  )
  if (!needsExcerpt) return none
  const [best, ...rest] = rankSections(document.sections, matched, found)
  if (best === undefined) return none
  return {
    ...base,
    anchor: best.anchor,
    excerpt: excerptOf(best, found),
    sections: extraSections(rest, found),
  }
}

/** The next sections under a heading, with their excerpts. */
function extraSections(
  sections: readonly SearchSection[],
  found: ReadonlySet<string>
): SearchSectionHit[] {
  const extra: SearchSectionHit[] = []
  for (const section of sections) {
    if (extra.length === EXTRA_SECTIONS) break
    if (section.anchor === null) continue
    extra.push({
      anchor: section.anchor,
      heading: section.heading,
      excerpt: excerptOf(section, found),
    })
  }
  return extra
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
 * The sections holding any of the query's terms, those holding the most
 * first, in page order on a tie.
 */
function rankSections(
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
