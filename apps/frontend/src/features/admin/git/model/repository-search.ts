import { foldText } from "@/lib/fold-text"

/**
 * Whether `repository` matches the search `query`: every word of it, ignoring
 * case and accents, appears in its name or slug. An empty query matches all.
 */
export function matchesSearch(
  repository: { name: string; slug: string },
  query: string
): boolean {
  const haystack = foldText(`${repository.name} ${repository.slug}`)
  return foldText(query)
    .split(/\s+/)
    .filter((word) => word !== "")
    .every((word) => haystack.includes(word))
}
