import { useQueries } from "@tanstack/react-query"
import { useMemo } from "react"
import {
  getSearchSourceSurfaces,
  recordHref,
  recordTrail,
  sourceSearchText,
  surfaceSearchSources,
} from "@/features/app-shell/authenticated/model/surface-search-sources"
import { resolveIconRef } from "@/lib/icon-registry"
import type { SiteNavSearchGroup } from "@/lib/site-nav"

interface UseSurfaceSearchRecordsOptions {
  isAdmin: boolean
  /** Fetch only while the search dialog is open. */
  enabled: boolean
  /**
   * What the user typed once they paused (the dialog debounces it), which
   * server-searched sources query.
   */
  settledSearch: string
  /** The repository the dialog searches, `undefined` for every one. */
  scope: string | undefined
}

/**
 * Records behind the dynamic surfaces that declare a `searchSource`, as one
 * search group per source. Full-list sources reuse each list page's query
 * (shared cache, so an already loaded list costs no request); server-searched
 * ones ask their entity's `search` for the settled text, minus the words
 * their own section labels already match. A source that is still loading or
 * failed yields no group, so the static results never wait on it.
 */
export function useSurfaceSearchRecords({
  isAdmin,
  enabled,
  settledSearch,
  scope,
}: UseSurfaceSearchRecordsOptions): SiteNavSearchGroup[] {
  const targets = useMemo(() => getSearchSourceSurfaces(isAdmin), [isAdmin])
  const results = useQueries({
    queries: targets.map((target) =>
      surfaceSearchSources[target.source].queryOptions({
        enabled,
        search: sourceSearchText(target, settledSearch),
        scope,
      })
    ),
  })

  return targets.flatMap(({ surface, source, trail }, index) => {
    const entries = results[index]?.data
    if (!entries?.length) return []
    const heading = surfaceSearchSources[source].heading
    const icon = resolveIconRef(surface.icon)
    const items = entries.flatMap((entry) => {
      const href = recordHref(surface.path, entry)
      if (href == null) return []
      return [
        {
          href,
          label: entry.label,
          description: entry.description ?? surface.description,
          icon,
          section: heading,
          trail: recordTrail(trail, entry),
          keywords: [surface.label, ...(entry.keywords ?? [])],
          excerpt: entry.excerpt,
          sections: entry.sections,
          missing: entry.missing,
        },
      ]
    })
    return items.length > 0 ? [{ label: heading, items }] : []
  })
}
