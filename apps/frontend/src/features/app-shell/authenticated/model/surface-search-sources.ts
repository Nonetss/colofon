import {
  keepPreviousData,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query"
import { docSearchEntries } from "@/features/app-shell/authenticated/model/doc-search-entries"
import {
  type AppSurface,
  appSurfaceList,
  isSurfacePathActive,
  type SurfaceSearchSourceId,
} from "@/lib/app-surfaces"
import { foldText } from "@/lib/fold-text"
import { orpc } from "@/lib/orpc"
import type { SiteNavSearchExcerpt, SiteNavSearchSection } from "@/lib/site-nav"

/** One record behind a dynamic surface, as the navbar search lists it. */
export interface SurfaceSearchEntry {
  /** Values for the surface path's `[param]` segments. */
  params: Record<string, string>
  /** The record's route when the source knows it, instead of `params`. */
  href?: string
  /**
   * Sections above the record when the source knows them, instead of the
   * concrete-path surfaces above the surface's route.
   */
  trail?: string[]
  label: string
  description?: string
  /**
   * Extra terms the record matches on, for what a server-searched source's
   * endpoint matched but the label doesn't show (an address, a code).
   */
  keywords?: string[]
  /** Where a full-text search matched, shown instead of the description. */
  excerpt?: SiteNavSearchExcerpt
  /** Other sections of the record where a full-text search matched. */
  sections?: SiteNavSearchSection[]
  /** The query's words the record lacks, in a partial answer. */
  missing?: string[]
}

/** What the dialog tells every source. */
export interface SourceQueryOptions {
  enabled: boolean
  /** Settled text for a server-searched source; full-list sources ignore it. */
  search: string
  /**
   * The repository the dialog searches, `undefined` for every one; sources
   * whose records don't belong to a repository ignore it.
   */
  scope: string | undefined
}

type SearchQueryOptions<TData, TError, TQueryKey extends QueryKey> = (
  options: SourceQueryOptions
) => UseQueryOptions<TData, TError, SurfaceSearchEntry[], TQueryKey>

/**
 * One source of the registry. It keeps its procedure's own record, error and
 * key types, so nothing is erased: the registry is checked with `satisfies`
 * and the hook reads the union of the actual sources.
 */
export interface SurfaceSearchSource<
  TData,
  TError,
  TQueryKey extends QueryKey,
> {
  /** Heading of the search group that lists this source's records. */
  heading: string
  /**
   * `true` when the entity is listed in pages, so the source asks the
   * entity's `search` for the records matching the text instead of loading
   * its whole `list`.
   */
  serverSearch: boolean
  /**
   * The entity's own query with a `select` that maps the records to entries.
   * A full-list source keeps the list page's options (same key, so same
   * cache and invalidation); a server-searched one spreads
   * `serverSearchQuery`.
   */
  queryOptions: SearchQueryOptions<TData, TError, TQueryKey>
}

/**
 * What the registry checks on every entry. Its `queryOptions`, and the
 * `select` inside, are already checked by `defineSearchSource` and
 * `defineServerSearchSource`, which every entry goes through.
 */
interface SurfaceSearchSourceShape {
  heading: string
  serverSearch: boolean
}

/** Records a server-searched source lists, `searchLimit()`'s default. */
const SEARCH_RECORD_LIMIT = 5
/** Documentation pages the search lists: ranked results, so a few more. */
const DOC_SEARCH_LIMIT = 10
/** Shortest text a server-searched source is asked for, as `searchQuery()`. */
const MIN_SERVER_SEARCH_LENGTH = 2

/**
 * A source that loads the entity's whole list. `select` is type-checked
 * against the procedure's output.
 */
export function defineSearchSource<TData, TError, TQueryKey extends QueryKey>(
  heading: string,
  queryOptions: SearchQueryOptions<TData, TError, TQueryKey>
): SurfaceSearchSource<TData, TError, TQueryKey> {
  return { heading, serverSearch: false, queryOptions }
}

/** `defineSearchSource` for an entity listed in pages: see the registry. */
export function defineServerSearchSource<
  TData,
  TError,
  TQueryKey extends QueryKey,
>(
  heading: string,
  queryOptions: SearchQueryOptions<TData, TError, TQueryKey>
): SurfaceSearchSource<TData, TError, TQueryKey> {
  return { heading, serverSearch: true, queryOptions }
}

/**
 * Input and gating for a server-searched source's `search` procedure (the
 * `{ query, limit }` shape of `#shared/search`): asked only while the dialog
 * is open and the text is long enough, keeping the last answer on screen
 * while the next one loads but not once the text no longer searches.
 */
export function serverSearchQuery(
  { enabled, search }: Pick<SourceQueryOptions, "enabled" | "search">,
  limit = SEARCH_RECORD_LIMIT
) {
  const input = { query: search, limit }
  const searchable = enabled && search.length >= MIN_SERVER_SEARCH_LENGTH
  if (!searchable) {
    return { input, enabled: false, placeholderData: undefined }
  }
  return { input, enabled: true, placeholderData: keepPreviousData }
}

/**
 * Input and gating of `v1.docs.search` for the dialog's settled text and
 * scope. The pages source and the dialog's catalog and partial notice both
 * spread it, so they share one query key and one request.
 */
export function docsSearchQuery(options: SourceQueryOptions) {
  const query = serverSearchQuery(options, DOC_SEARCH_LIMIT)
  return { ...query, input: { ...query.input, repository: options.scope } }
}

/**
 * How the navbar search enumerates the records of each dynamic surface that
 * declares a `searchSource` in `app-surfaces.ts`: always through that
 * entity's own procedure. Keyed by the full id union, so a new source key
 * fails type-checking until it gets an entry here.
 *
 * An entity listed in full uses its `list` with `defineSearchSource`, and
 * the dialog matches the loaded records locally. An entity listed in pages
 * uses its `search` (see the stack skill's `references/api/free-text-search.md`)
 * with `defineServerSearchSource`, which the hook asks for the settled text:
 *
 * ```ts
 * "devices": defineServerSearchSource("Dispositivos", (options) =>
 *   orpc.v1.device.search.queryOptions({
 *     ...serverSearchQuery(options),
 *     select: ({ devices }) =>
 *       devices.map((device) => ({
 *         params: { id: device.id },
 *         label: device.name ?? device.ip,
 *         description: device.ip,
 *         keywords: [device.ip],
 *       })),
 *   })
 * ),
 * ```
 */
export const surfaceSearchSources = {
  // Full text over the pages of the dialog's scope (the server reads every
  // repository when it names none).
  "doc-pages": defineServerSearchSource("Documentación", (options) =>
    orpc.v1.docs.search.queryOptions({
      ...docsSearchQuery(options),
      select: docSearchEntries,
    })
  ),
} satisfies Record<SurfaceSearchSourceId, SurfaceSearchSourceShape>

export interface SearchSourceSurface {
  surface: AppSurface
  source: SurfaceSearchSourceId
  /** Labels of the concrete-path surfaces above the route, outermost first. */
  trail: string[]
}

/**
 * Labels of the concrete-path surfaces a record's route sits under
 * (`/admin/git/[repo]` → "Admin", "Git"; a deeper route lists every section above it,
 * outermost first). Shown before the record's label and matched like it, so
 * typing a section's name lists its records.
 */
function getRecordTrail(surface: AppSurface): string[] {
  const staticPrefix = surface.path.slice(0, surface.path.indexOf("[") - 1)
  return appSurfaceList
    .filter(
      (other) =>
        !other.path.includes("[") &&
        isSurfacePathActive(other.path, staticPrefix)
    )
    .map((other) => other.label)
}

/**
 * The words of `search` that none of the source's own section labels
 * contain, which are what its server search has to find ("git manual" →
 * "manual"). The dialog still matches the dropped words locally, against
 * the record's trail and surface label.
 */
export function serverSearchText(search: string, sectionLabels: string[]) {
  const foldedLabels = sectionLabels.map(foldText)
  return search
    .split(/\s+/)
    .filter(
      (word) =>
        word && !foldedLabels.some((label) => label.includes(foldText(word)))
    )
    .join(" ")
}

/**
 * The text a source's server search is asked for: the settled text minus its
 * own section words for a server-searched source, nothing for a full-list one.
 */
export function sourceSearchText(
  { surface, source, trail }: SearchSourceSurface,
  settledSearch: string
): string {
  if (!surfaceSearchSources[source].serverSearch) return ""
  return serverSearchText(settledSearch, [...trail, surface.label])
}

/**
 * Dynamic surfaces whose records the navbar search lists for this user:
 * a `[param]` path with a `searchSource`, `adminOnly` ones only for admins.
 */
export function getSearchSourceSurfaces(
  isAdmin: boolean
): SearchSourceSurface[] {
  return appSurfaceList.flatMap((surface) => {
    if (!surface.searchSource || !surface.path.includes("[")) return []
    if (surface.adminOnly && !isAdmin) return []
    return [
      {
        surface,
        source: surface.searchSource,
        trail: getRecordTrail(surface),
      },
    ]
  })
}

/** A record's route: the one it brings, or its surface path filled in. */
export function recordHref(
  surfacePath: string,
  entry: Pick<SurfaceSearchEntry, "href" | "params">
): string | null {
  if (entry.href !== undefined) return entry.href
  return fillSurfacePath(surfacePath, entry.params)
}

/** The sections shown before a record: its own, or its surface's. */
export function recordTrail(
  surfaceTrail: string[],
  entry: Pick<SurfaceSearchEntry, "trail">
): string[] {
  if (entry.trail !== undefined) return entry.trail
  return surfaceTrail
}

/**
 * Fills each `[name]` segment of a surface path (`/admin/git/[repo]`) with the
 * URI-encoded value from `params`; `null` when a segment has no value.
 */
export function fillSurfacePath(
  path: string,
  params: Record<string, string>
): string | null {
  let missing = false
  const filled = path.replace(/\[([^\]]+)\]/g, (_segment, name: string) => {
    const value = params[name]
    if (!value) missing = true
    return encodeURIComponent(value ?? "")
  })
  if (missing) return null
  return filled
}
