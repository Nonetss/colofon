import type { DocsSearchEntity } from "@/features/app-shell/authenticated/model/doc-search-entries"
import type { SiteNavSearchItem } from "@/lib/site-nav"

/**
 * What the dialog's filter matches a result against: its own texts and
 * extra keywords. A result's extra sections take the same, so the filter
 * keeps them exactly when it keeps their page.
 */
export function searchItemKeywords(item: SiteNavSearchItem): string[] {
  return [
    item.label,
    item.description,
    item.section,
    ...(item.trail ?? []),
    ...(item.keywords ?? []),
  ]
}

/** What an entity shows under its label: its type, and where it lives. */
export function entityDescription(
  entity: DocsSearchEntity,
  allRepositories: boolean
): string {
  if (!allRepositories) return entity.type.plural
  return `${entity.type.plural} · ${entity.repository.name}`
}

/**
 * What the dialog's filter matches an entity against: its texts plus the
 * words the server searched, which the entity holds somewhere (a field
 * value, with a typo) even when its label doesn't show them.
 */
export function entityKeywords(
  entity: DocsSearchEntity,
  searchedTerms: readonly string[]
): string[] {
  return [
    entity.label,
    entity.id,
    entity.type.plural,
    entity.repository.name,
    ...searchedTerms,
  ]
}
