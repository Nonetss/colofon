import { getIcon } from "@/lib/icon-registry"

const OctagonX = getIcon("status", "error")
const ScrollText = getIcon("admin", "logs")
const RotateCw = getIcon("actions", "refresh")

import { useCallback, useMemo, useState } from "react"
import { textVariants } from "@/components/shared/brand/typography"
import { DataTableView } from "@/components/shared/data-display/data-table-view"
import { InfiniteScrollSentinel } from "@/components/shared/data-display/infinite-scroll-sentinel"
import { JsonView } from "@/components/shared/data-display/json-view"
import { FilterChips } from "@/components/shared/resource/filter-chips"
import {
  chipsFor,
  type ResourceFilterChip,
  type ResourceFilterDescriptor,
  ResourceFilters,
} from "@/components/shared/resource/resource-filters"
import { ResourceOverview } from "@/components/shared/resource/resource-overview"
import { Button } from "@/components/ui/button"
import { UserEmailPicker } from "@/features/admin/logs/components/user-email-picker"
import {
  type ActivityLogRow,
  LOG_DEFAULT_SORT,
  LOG_SORT_KEYS,
  LogUser,
  logColumnLayout,
  logColumns,
  logDateTime,
} from "@/features/admin/logs/definitions/log-columns.definition"
import { useActivityLog } from "@/features/admin/logs/hooks/use-activity-log"
import type {
  ActivityTypeFilter,
  HttpMethodFilter,
} from "@/features/admin/logs/model/types"
import { useAdminUser } from "@/hooks/use-admin-user"
import { useColumnPreferences } from "@/hooks/use-column-preferences"
import { columnPreferenceProps, useDataTable } from "@/hooks/use-data-table"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useSortQueryParam } from "@/hooks/use-sort-query-param"
import { cn } from "@/lib/utils"

export function LogsContent() {
  const [sorting, setSorting, ordering] = useSortQueryParam(
    LOG_SORT_KEYS,
    LOG_DEFAULT_SORT
  )
  const {
    entries,
    filters,
    setFilters,
    clearFilters,
    activeCount,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isPending,
    isError,
    refetch,
    isRefetching,
  } = useActivityLog(ordering)
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

  const filterDescriptors: ResourceFilterDescriptor[] = [
    {
      kind: "custom",
      key: "log-filter-user",
      label: "Usuario",
      isActive: !!filters.userId,
      render: () => (
        <UserEmailPicker
          userId={filters.userId || null}
          onChange={(userId) =>
            setFilters((f) => ({ ...f, userId: userId ?? "" }))
          }
        />
      ),
    },
    {
      kind: "select",
      key: "log-filter-type",
      label: "Tipo",
      value: filters.type,
      onChange: (value) =>
        setFilters((f) => ({ ...f, type: value as ActivityTypeFilter })),
      placeholder: "Todos los tipos",
      options: [
        { value: "all", label: "Todos los tipos" },
        { value: "page_view", label: "Frontend" },
        { value: "api_call", label: "Backend" },
      ],
      defaultValue: "all",
      isActive: (value) => value !== "all",
    },
    {
      kind: "select",
      key: "log-filter-method",
      label: "Método",
      value: filters.method,
      onChange: (value) =>
        setFilters((f) => ({ ...f, method: value as HttpMethodFilter })),
      placeholder: "Todos los métodos",
      options: [
        { value: "all", label: "Todos los métodos" },
        { value: "GET", label: "GET" },
        { value: "QUERY", label: "QUERY" },
        { value: "POST", label: "POST" },
        { value: "PUT", label: "PUT" },
        { value: "PATCH", label: "PATCH" },
        { value: "DELETE", label: "DELETE" },
      ],
      defaultValue: "all",
      isActive: (value) => value !== "all",
    },
    {
      kind: "search",
      key: "log-filter-path",
      label: "Ruta",
      value: filters.path,
      onChange: (value) => setFilters((f) => ({ ...f, path: value })),
      placeholder: "/admin/...",
    },
    {
      kind: "date",
      key: "log-filter-from",
      label: "Desde",
      value: filters.from,
      onChange: (date) => setFilters((f) => ({ ...f, from: date })),
      placeholder: "Fecha inicial",
    },
    {
      kind: "date",
      key: "log-filter-to",
      label: "Hasta",
      value: filters.to,
      onChange: (date) => setFilters((f) => ({ ...f, to: date })),
      placeholder: "Fecha final",
    },
  ]

  // Every filter applies live, so the sheet's draft total is the loaded
  // count — but only once it is the real total; while more pages exist the
  // list only knows a lower bound, so the sheet keeps its "Cargando…" label.
  const loadedTotal = useCallback(() => entries.length, [entries.length])
  const fetchDraftTotal = hasNextPage ? undefined : loadedTotal

  // `chipsFor` skips `custom` descriptors, so the user picker's chip is
  // appended by hand.
  const { data: filteredUser } = useAdminUser(filters.userId || null)
  const userChips: ResourceFilterChip[] = filters.userId
    ? [
        {
          key: "log-filter-user",
          label: `Usuario: ${filteredUser?.name ?? filters.userId}`,
          onRemove: () => setFilters((f) => ({ ...f, userId: "" })),
        },
      ]
    : []

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
        <div className="space-y-3">
          <ResourceFilters
            columns={3}
            filters={filterDescriptors}
            onClear={clearFilters}
            fetchDraftTotal={fetchDraftTotal}
            count={
              isPending || isError
                ? undefined
                : entries.length === 0
                  ? undefined
                  : hasNextPage
                    ? `${entries.length}+ entradas`
                    : `${entries.length} ${entries.length === 1 ? "entrada" : "entradas"}`
            }
          />
          <FilterChips
            chips={[...userChips, ...chipsFor(filterDescriptors)]}
            onClear={clearFilters}
          />
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
      isEmpty={(data) => data.length === 0}
      empty={{
        icon: <ScrollText className="size-6" />,
        title: "No hay actividad registrada",
        description:
          "Puede que Loki no esté configurado (LOKI_URL) o que aún no haya navegaciones ni llamadas registradas.",
      }}
      hasActiveFilters={activeCount > 0}
      filteredEmpty={{
        icon: <ScrollText className="size-6" />,
        title: "Ningún resultado para este filtro",
        description: "Prueba a limpiar o ajustar los filtros.",
        onClear: clearFilters,
      }}
    >
      {() => (
        <DataTableView
          table={table}
          label="Actividad"
          idPrefix="admin-logs"
          onResetColumns={preferences.reset}
          scrollRef={setScrollContainer}
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
