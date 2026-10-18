import MiniSearch, { type SearchResult } from "minisearch"
import { entityPath } from "#contract/catalog/paths"
import type { Catalog } from "#contract/catalog/read"
import type { NavNode } from "#pages/nav"
import { excerptOf, type SearchExcerpt } from "#pages/search/excerpt"
import {
  compareEntityHits,
  comparePartialHits,
  foundTerms,
  fuzzinessOf,
  inHeaderFields,
  missingTerms,
  pageResults,
  rankSections,
} from "#pages/search/rank"
import {
  foldTerm,
  type SearchSection,
  sectionsOf,
  wordsOf,
} from "#pages/search/text"
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

/** Sections a hit carries besides the one its excerpt comes from. */
const EXTRA_SECTIONS = 2

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

/** `value` folded and without separators: `DATABASE_URL` is `databaseurl`. */
function compactKey(value: string): string {
  return foldTerm(value).replace(KEY_SEPARATORS, "")
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

export type { SearchExcerpt, SearchHighlight } from "#pages/search/excerpt"
