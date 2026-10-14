import { getIcon } from "@/lib/icon-registry"

const OctagonX = getIcon("status", "error")
const ScrollText = getIcon("admin", "logs")
const RotateCw = getIcon("actions", "refresh")

import { useMemo, useState } from "react"
import { textVariants } from "@/components/shared/brand/typography"
import type { DataTableFilter } from "@/components/shared/data-display/data-table-column-filter"
import { DataTableView } from "@/components/shared/data-display/data-table-view"
import { FilteredEmpty } from "@/components/shared/data-display/filtered-empty"
import { InfiniteScrollSentinel } from "@/components/shared/data-display/infinite-scroll-sentinel"
import { JsonView } from "@/components/shared/data-display/json-view"
import { SearchInput } from "@/components/shared/form/search-input"
import { ResourceOverview } from "@/components/shared/resource/resource-overview"
import { AppLink } from "@/components/ui/app-link"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import {
  type ActivityLogRow,
  LOG_DEFAULT_SORT,
  LOG_METHOD_OPTIONS,
  LOG_SORT_KEYS,
  LOG_STATUS_OPTIONS,
  LOG_TYPE_OPTIONS,
  LogUser,
  logColumnLayout,
  logColumns,
  logDateTime,
  logMethodsOf,
  logStatusClassesOf,
  logTypesOf,
} from "@/features/admin/logs/definitions/log-columns.definition"
import { useActivityLog } from "@/features/admin/logs/hooks/use-activity-log"
import type { ActivityLogEntry } from "@/features/admin/logs/model/types"
import { type FilterUser, useUserFilterOptions } from "@/features/admin/shared"
import { useAdminUserSearch } from "@/hooks/use-admin-user-search"
import { useColumnPreferences } from "@/hooks/use-column-preferences"
import { columnPreferenceProps, useDataTable } from "@/hooks/use-data-table"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import {
  NO_VALUES,
  useQueryParam,
  valueListCodec,
} from "@/hooks/use-query-param"
import { useSortQueryParam } from "@/hooks/use-sort-query-param"
import { cn } from "@/lib/utils"

const TRACE_ID_PATTERN = /^[0-9a-f]{32}$/

/** The `?trace=` filter, set when arriving from a trace's page. Anything
 *  that isn't a trace id is ignored instead of failing the query. */
function traceIdOf(param: string): string {
  if (TRACE_ID_PATTERN.test(param)) return param
  return ""
}

/** The users named on the loaded entries. Entries carry the email logged
 *  with them but no name, so the email names them in the filter. */
function usersOf(entries: readonly ActivityLogEntry[]): FilterUser[] {
  const users: FilterUser[] = []
  for (const entry of entries) {
    if (!entry.userId || !entry.email) continue
    users.push({ id: entry.userId, name: entry.email, email: "" })
  }
  return users
}

export function LogsContent() {
  const [sorting, setSorting, ordering] = useSortQueryParam(
    LOG_SORT_KEYS,
    LOG_DEFAULT_SORT
  )
  const [userParam, setUserParam] = useQueryParam(
    "user",
    NO_VALUES,
    valueListCodec
  )
  const [typeParam, setTypeParam] = useQueryParam(
    "type",
    NO_VALUES,
    valueListCodec
  )
  const [methodParam, setMethodParam] = useQueryParam(
    "method",
    NO_VALUES,
    valueListCodec
  )
  const [statusParam, setStatusParam] = useQueryParam(
    "status",
    NO_VALUES,
    valueListCodec
  )
  const [traceParam, setTraceParam] = useQueryParam("trace", "")
  const traceId = traceIdOf(traceParam)
  const [path, setPath] = useState("")
  const [from, setFrom] = useState<Date | undefined>(undefined)
  const [to, setTo] = useState<Date | undefined>(undefined)
  const debouncedPath = useDebouncedValue(path)
  // Unknown values in the URL are dropped instead of emptying the list.
  const types = logTypesOf(typeParam)
  const methods = logMethodsOf(methodParam)
  const statuses = logStatusClassesOf(statusParam)
  const {
    entries,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isPending,
    isError,
    refetch,
    isRefetching,
  } = useActivityLog(ordering, {
    userIds: userParam,
    types,
    methods,
    statuses,
    path: debouncedPath,
    from,
    to,
    traceId,
  })
  const rows = useMemo<ActivityLogRow[]>(
    () =>
      entries.map((entry, index) => ({
        ...entry,
        rowKey: `${entry.timestamp}-${index}`,
      })),
    [entries]
  )
  const preferences = useColumnPreferences("admin-logs", logColumnLayout)
  const table = useDataTable({
    data: rows,
    columns: logColumns,
    getRowId: (entry) => entry.rowKey,
    sorting,
    onSortingChange: setSorting,
    ...columnPreferenceProps(preferences),
  })

  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(
    null
  )
  const sentinelRef = useInfiniteScroll(
    scrollContainer,
    fetchNextPage,
    hasNextPage && !isFetchingNextPage
  )

  const [userQuery, setUserQuery] = useState("")
  const userSearch = useAdminUserSearch(userQuery)
  const entryUsers = useMemo(() => usersOf(entries), [entries])
  const userOptions = useUserFilterOptions({
    selected: userParam,
    seen: entryUsers,
    results: userSearch.results,
  })

  const filtered =
    userParam.length > 0 ||
    types.length > 0 ||
    methods.length > 0 ||
    statuses.length > 0 ||
    debouncedPath.trim() !== "" ||
    from !== undefined ||
    to !== undefined ||
    traceId !== ""
  const clearFilters = () => {
    setTraceParam("")
    setUserParam(NO_VALUES)
    setTypeParam(NO_VALUES)
    setMethodParam(NO_VALUES)
    setStatusParam(NO_VALUES)
    setPath("")
    setFrom(undefined)
    setTo(undefined)
  }
  // An empty list is "every value": store the shared constant so the param
  // drops out of the URL.
  const valuesSetter =
    (set: (values: readonly string[]) => void) => (next: string[]) => {
      if (next.length === 0) {
        set(NO_VALUES)
        return
      }
      set(next)
    }
  const filters: Partial<Record<string, DataTableFilter>> = {
    user: {
      options: userOptions,
      selected: userParam,
      onChange: valuesSetter(setUserParam),
      search: {
        query: userQuery,
        onQueryChange: setUserQuery,
        isLoading: userSearch.isFetching,
        hint: "Escribe al menos 2 letras del nombre o el email",
      },
    },
    method: {
      options: LOG_METHOD_OPTIONS,
      selected: methods,
      onChange: valuesSetter(setMethodParam),
    },
    type: {
      options: LOG_TYPE_OPTIONS,
      selected: types,
      onChange: valuesSetter(setTypeParam),
    },
    statusCode: {
      options: LOG_STATUS_OPTIONS,
      selected: statuses,
      onChange: valuesSetter(setStatusParam),
    },
  }

  return (
    <ResourceOverview
      maxWidth="80%"
      surface="admin-logs"
      description="Páginas visitadas y endpoints llamados por cada usuario."
      heroAction={
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isPending || isRefetching}
        >
          <RotateCw
            className={cn("size-3.5", isRefetching && "animate-spin")}
          />
          Actualizar
        </Button>
      }
      filters={
        <div className="@container">
          <div className="grid gap-2 @xl:grid-cols-[minmax(0,1fr)_auto_auto]">
            <SearchInput
              value={path}
              onValueChange={setPath}
              placeholder="Filtrar por ruta: /admin/..."
              label="Filtrar por ruta"
            />
            <DatePicker
              value={from}
              onChange={setFrom}
              placeholder="Desde"
              aria-label="Desde"
            />
            <DatePicker
              value={to}
              onChange={setTo}
              placeholder="Hasta"
              aria-label="Hasta"
            />
          </div>
          {traceId !== "" && (
            <div
              className={cn(
                textVariants({ role: "compact", tone: "muted" }),
                "mt-2 flex flex-wrap items-center gap-2"
              )}
            >
              <span>
                Entradas de la traza{" "}
                <AppLink
                  href={`/admin/traces?trace=${traceId}`}
                  className="font-mono text-foreground underline underline-offset-4"
                >
                  {traceId.slice(0, 12)}…
                </AppLink>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTraceParam("")}
              >
                Quitar filtro
              </Button>
            </div>
          )}
        </div>
      }
      query={{ data: entries, isPending, isError, refetch }}
      loading="Cargando registro de actividad..."
      error={{
        icon: <OctagonX className="size-6" />,
        title: "No se pudo cargar el registro de actividad",
        description:
          "Comprueba tu conexión y que tu sesión tenga permisos de administración.",
      }}
      isEmpty={(data) => data.length === 0 && !filtered}
      empty={{
        icon: <ScrollText className="size-6" />,
        title: "No hay actividad registrada",
        description:
          "Puede que Loki no esté configurado (LOKI_URL) o que aún no haya navegaciones ni llamadas registradas.",
      }}
    >
      {() => (
        <DataTableView
          table={table}
          label="Actividad"
          idPrefix="admin-logs"
          onResetColumns={preferences.reset}
          scrollRef={setScrollContainer}
          filters={filters}
          emptyMessage={
            <FilteredEmpty
              message="Ninguna entrada coincide con los filtros."
              onClear={clearFilters}
            />
          }
          renderDetail={(entry) => (
            <div className="grid gap-3">
              <dl
                className={cn(
                  textVariants({ role: "compact" }),
                  "grid grid-cols-2 gap-x-5 gap-y-2"
                )}
              >
                <div>
                  <dt className="text-muted-foreground">Usuario</dt>
                  <dd className="mt-0.5 truncate">
                    <LogUser entry={entry} />
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Fecha</dt>
                  <dd className="mt-0.5 font-mono tabular-nums">
                    {logDateTime(entry)}
                  </dd>
                </div>
                {entry.traceId !== null && (
                  <div>
                    <dt className="text-muted-foreground">Traza</dt>
                    <dd className="mt-0.5">
                      <AppLink
                        href={`/admin/traces?trace=${entry.traceId}`}
                        className="underline underline-offset-4"
                      >
                        Ver traza
                      </AppLink>
                    </dd>
                  </div>
                )}
              </dl>
              <JsonView
                value={entry.raw}
                className="overflow-x-auto rounded-md border-0 bg-muted/40"
              />
            </div>
          )}
          detailLabel={(entry) =>
            `Ver la entrada completa de ${logDateTime(entry)}`
          }
          footer={
            <InfiniteScrollSentinel
              sentinelRef={sentinelRef}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
            />
          }
        />
      )}
    </ResourceOverview>
  )
}
