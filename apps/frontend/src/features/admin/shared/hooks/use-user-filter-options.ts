import { useEffect, useMemo, useState } from "react"
import type { DataTableFilterOption } from "@/components/shared/data-display/data-table-column-filter"
import type { AdminUserSearchResult } from "@/hooks/use-admin-user-search"

/** A user the page has seen, with enough to name it in the filter. */
export interface FilterUser {
  id: string
  name: string
  email: string
}

function labelsOf(
  seen: readonly FilterUser[],
  results: readonly AdminUserSearchResult[]
): Map<string, FilterUser> {
  const labels = new Map<string, FilterUser>()
  for (const user of seen) labels.set(user.id, user)
  for (const user of results) labels.set(user.id, user)
  return labels
}

function optionOf(id: string, user: FilterUser | undefined) {
  if (!user) return { value: id, label: id }
  return { value: id, label: user.name, detail: user.email }
}

/**
 * The options of an admin table's user filter (searched on the server): the
 * users already kept — named from any row or search result seen, so a later
 * search doesn't turn them back into ids — then the current results.
 */
export function useUserFilterOptions({
  selected,
  seen,
  results,
}: {
  selected: readonly string[]
  /** Users on the rows already loaded. */
  seen: readonly FilterUser[]
  results: readonly AdminUserSearchResult[]
}): DataTableFilterOption[] {
  const [known, setKnown] = useState<ReadonlyMap<string, FilterUser>>(
    () => new Map()
  )

  useEffect(() => {
    const labels = labelsOf(seen, results)
    setKnown((previous) => {
      const missing = [...labels.keys()].some((id) => !previous.has(id))
      if (!missing) return previous
      return new Map([...previous, ...labels])
    })
  }, [seen, results])

  return useMemo(() => {
    const labels = labelsOf(seen, results)
    const labelFor = (id: string) => {
      const label = labels.get(id)
      if (label) return label
      return known.get(id)
    }
    const options: DataTableFilterOption[] = selected.map((id) =>
      optionOf(id, labelFor(id))
    )
    for (const user of results) {
      if (selected.includes(user.id)) continue
      options.push({ value: user.id, label: user.name, detail: user.email })
    }
    return options
  }, [selected, seen, results, known])
}
