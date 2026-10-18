import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import {
  type DocsSearchMeta,
  docSearchMeta,
} from "@/features/app-shell/authenticated/model/doc-search-entries"
import {
  docsSearchQuery,
  getSearchSourceSurfaces,
  sourceSearchText,
} from "@/features/app-shell/authenticated/model/surface-search-sources"
import { orpc } from "@/lib/orpc"

interface UseDocsSearchMetaOptions {
  isAdmin: boolean
  /** Fetch only while the search dialog is open. */
  enabled: boolean
  /** The same settled text the records get. */
  settledSearch: string
  /** The repository the dialog searches, `undefined` for every one. */
  scope: string | undefined
}

/**
 * The documentation search's partial flag and catalog entities, which are
 * not records of a surface. It asks the same `v1.docs.search` as the pages
 * source, with the same input, so both read one cached answer.
 */
export function useDocsSearchMeta({
  isAdmin,
  enabled,
  settledSearch,
  scope,
}: UseDocsSearchMetaOptions): DocsSearchMeta | undefined {
  const target = useMemo(
    () =>
      getSearchSourceSurfaces(isAdmin).find(
        (surface) => surface.source === "doc-pages"
      ),
    [isAdmin]
  )
  const search = target ? sourceSearchText(target, settledSearch) : ""
  const { data } = useQuery(
    orpc.v1.docs.search.queryOptions({
      ...docsSearchQuery({
        enabled: enabled && target !== undefined,
        search,
        scope,
      }),
      select: docSearchMeta,
    })
  )
  return data
}
