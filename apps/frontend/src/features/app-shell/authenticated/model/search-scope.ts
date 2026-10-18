import {
  ALL_SCOPE,
  type DocsNav,
  resolveScope,
} from "@/features/docs/shared/public"

/** The repository the dialog can narrow its search to. */
export interface ScopeRepository {
  slug: string
  name: string
}

/**
 * The repository the reader's scope names, which the dialog's switch offers
 * against "Todos"; `null` when the scope is "Todos" or there is only one
 * repository to read, so there is nothing to switch.
 */
export function scopeSwitchRepository(
  stored: string | undefined,
  repositories: DocsNav["repositories"]
): ScopeRepository | null {
  const available = repositories.filter((repository) => repository.available)
  if (available.length < 2) return null
  const scope = resolveScope(
    stored,
    available.map((repository) => repository.slug)
  )
  if (scope.kind === "all") return null
  const found = available.find((repository) => repository.slug === scope.slug)
  if (found === undefined) return null
  return { slug: found.slug, name: found.name }
}

/**
 * The repository the dialog asks the search for: none when the user
 * switched to "Todos" or the reader's scope is "Todos", else the stored one
 * (the server searches everything when it names no readable repository).
 */
export function searchRepositoryOf(
  stored: string | undefined,
  everywhere: boolean
): string | undefined {
  if (everywhere || stored === ALL_SCOPE) return undefined
  return stored
}
