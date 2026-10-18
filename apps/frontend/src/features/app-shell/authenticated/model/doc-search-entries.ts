import type { AppRouterClient } from "@nonete/api/router"
import type { SurfaceSearchEntry } from "@/features/app-shell/authenticated/model/surface-search-sources"

/** What `v1.docs.search` answers. */
export type DocsSearchAnswer = Awaited<
  ReturnType<AppRouterClient["v1"]["docs"]["search"]>
>

type DocsSearchResult = DocsSearchAnswer["results"][number]

/** A catalog entity the documentation search found. */
export type DocsSearchEntity = DocsSearchAnswer["entities"][number]

/** What the dialog shows of a search besides its pages. */
export interface DocsSearchMeta {
  /** Whether more than one repository was searched. */
  allRepositories: boolean
  /** Whether no page holds every word. */
  partial: boolean
  entities: DocsSearchEntity[]
  /** Whether the catalog group goes before the pages: an exact entity. */
  entitiesFirst: boolean
}

/**
 * The documentation pages a search found, in the server's order, as navbar
 * search entries. With several repositories searched, each trail starts with
 * the page's repository, as the reader's "Todos" scope shows it. The typed
 * words become match keywords, so the dialog's own filter keeps pages the
 * server found in their body or with a typo.
 */
export function docSearchEntries({
  allRepositories,
  results,
}: DocsSearchAnswer): SurfaceSearchEntry[] {
  return results.map((result) => ({
    params: {},
    href: result.href,
    trail: trailOf(result, allRepositories),
    label: result.title,
    description: result.description,
    keywords: result.terms,
    excerpt: result.excerpt ?? undefined,
    sections: result.sections.map((section) => ({
      href: section.href,
      label: section.heading,
      excerpt: section.excerpt,
    })),
    missing: result.missing,
  }))
}

/** The answer's partial flag and catalog entities, in the server's order. */
export function docSearchMeta({
  allRepositories,
  partial,
  entities,
}: DocsSearchAnswer): DocsSearchMeta {
  return {
    allRepositories,
    partial,
    entities,
    entitiesFirst: entities.some((entity) => entity.exact),
  }
}

function trailOf(result: DocsSearchResult, allRepositories: boolean) {
  if (!allRepositories) return result.trail
  return [result.repository.name, ...result.trail]
}
