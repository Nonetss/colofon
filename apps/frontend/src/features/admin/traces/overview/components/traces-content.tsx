import { getIcon } from "@/lib/icon-registry"

const OctagonX = getIcon("status", "error")
const ChartGantt = getIcon("admin", "traces")
const RotateCw = getIcon("actions", "refresh")

import { useMemo, useState } from "react"
import { Text } from "@/components/shared/brand/typography"
import { DataTableIdentityCell } from "@/components/shared/data-display/data-table-cell-content"
import type { DataTableFilter } from "@/components/shared/data-display/data-table-column-filter"
import { DataTableView } from "@/components/shared/data-display/data-table-view"
import { FilteredEmpty } from "@/components/shared/data-display/filtered-empty"
import { StatusDot } from "@/components/shared/data-display/status-dot"
import { SearchInput } from "@/components/shared/form/search-input"
import { ResourceOverview } from "@/components/shared/resource/resource-overview"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { TracePanel } from "@/features/admin/traces/detail"
import {
  rootNameOf,
  TRACE_DEFAULT_SORT,
  TRACE_ERROR_FILTER_VALUE,
  TRACE_ERROR_OPTIONS,
  TRACE_NAME_COLUMN,
  TRACE_SORT_KEYS,
  traceColumnLayout,
  traceColumns,
  traceSortValues,
} from "@/features/admin/traces/overview/definitions/trace-columns.definition"
import {
  TRACE_SEARCH_LIMIT,
  useTraceSearch,
} from "@/features/admin/traces/overview/hooks/use-trace-search"
import {
  TRACE_SERVICE_OPTIONS,
  type TraceSummary,
  traceServicesOf,
} from "@/features/admin/traces/shared"
import { useColumnPreferences } from "@/hooks/use-column-preferences"
import { columnPreferenceProps, useDataTable } from "@/hooks/use-data-table"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import {
  NO_VALUES,
  useQueryParam,
  valueListCodec,
} from "@/hooks/use-query-param"
import { useSortQueryParam } from "@/hooks/use-sort-query-param"
import { sortRows } from "@/lib/sort-rows"
import { cn } from "@/lib/utils"

const TRACE_ID_PATTERN = /^[0-9a-f]{32}$/

/** The open trace from `?trace=` (links from the activity log land here);
 *  anything that isn't a trace id opens nothing. */
function traceIdOf(param: string): string {
  if (TRACE_ID_PATTERN.test(param)) return param
  return ""
}

/**
 * The trace the panel shows: the one in the URL, else the newest of the
 * list (the API answers newest first, whatever the table's sort) until the
 * admin closes the panel. The newest one stays out of the URL, so a refresh
 * keeps following the latest request.
 */
function openTraceOf(
  chosen: string,
  followNewest: boolean,
  traces: readonly TraceSummary[]
): string {
  if (chosen !== "") return chosen
  if (!followNewest) return ""
  const newest = traces[0]
  if (newest === undefined) return ""
  return newest.traceId
}

/** The trace's name cell: opens it in the panel, and marks the open one. */
function TraceNameCell({
  trace,
  open,
  onOpen,
}: {
  trace: TraceSummary
  open: boolean
  onOpen: () => void
}) {
  return (
    <DataTableIdentityCell
      primary={rootNameOf(trace)}
      secondary={
        <span className="font-mono">{trace.traceId.slice(0, 16)}</span>
      }
      onOpen={onOpen}
      label={`Ver la traza ${rootNameOf(trace)}`}
      leading={
        <StatusDot tone="primary" className={cn(!open && "invisible")} />
      }
    />
  )
}

/** A whole number of milliseconds from the input, or `undefined` for any. */
function minDurationOf(value: string): number | undefined {
  if (value.trim() === "") return undefined
  const ms = Number(value)
  if (!Number.isFinite(ms) || ms < 0) return undefined
  return Math.floor(ms)
}

export function TracesContent() {
  const [sorting, setSorting] = useSortQueryParam(
    TRACE_SORT_KEYS,
    TRACE_DEFAULT_SORT
  )
  const [serviceParam, setServiceParam] = useQueryParam(
    "service",
    NO_VALUES,
    valueListCodec
  )
  const [errorsParam, setErrorsParam] = useQueryParam(
    "errors",
    NO_VALUES,
    valueListCodec
  )
  const [traceParam, setTraceParam] = useQueryParam("trace", "")
  const chosenTraceId = traceIdOf(traceParam)
  const [followNewest, setFollowNewest] = useState(true)
  const [name, setName] = useState("")
  const [minDuration, setMinDuration] = useState("")
  const [from, setFrom] = useState<Date | undefined>(undefined)
  const [to, setTo] = useState<Date | undefined>(undefined)
  const debouncedName = useDebouncedValue(name)
  const debouncedMinDuration = useDebouncedValue(minDuration)

  // Unknown values in the URL are dropped instead of emptying the list.
  const services = traceServicesOf(serviceParam)
  const errorsOnly = errorsParam.includes(TRACE_ERROR_FILTER_VALUE)
  const minDurationMs = minDurationOf(debouncedMinDuration)

  const { data, isPending, isError, refetch, isRefetching } = useTraceSearch({
    services,
    errorsOnly,
    minDurationMs,
    name: debouncedName,
    from,
    to,
  })
  const traces = data?.traces ?? []
  const openTraceId = openTraceOf(chosenTraceId, followNewest, traces)
  const rows = useMemo(
    () => sortRows(traces, sorting, traceSortValues),
    [traces, sorting]
  )
  const preferences = useColumnPreferences("admin-traces", traceColumnLayout)
  const table = useDataTable({
    data: rows,
    columns: traceColumns,
    getRowId: (trace) => trace.traceId,
    sorting,
    onSortingChange: setSorting,
    ...columnPreferenceProps(preferences),
  })

  const filtered =
    services.length > 0 ||
    errorsOnly ||
    minDurationMs !== undefined ||
    debouncedName.trim() !== "" ||
    from !== undefined ||
    to !== undefined
  const clearFilters = () => {
    setServiceParam(NO_VALUES)
    setErrorsParam(NO_VALUES)
    setName("")
    setMinDuration("")
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
    service: {
      options: TRACE_SERVICE_OPTIONS,
      selected: services,
      onChange: valuesSetter(setServiceParam),
    },
    errors: {
      options: TRACE_ERROR_OPTIONS,
      selected: errorsParam,
      onChange: valuesSetter(setErrorsParam),
    },
  }

  // The panel needs the room: with a trace open the page fills the inset.
  const pageWidth = openTraceId === "" ? "80%" : "full"

  return (
    <ResourceOverview
      maxWidth={pageWidth}
      surface="admin-traces"
      description="Peticiones y ejecuciones de cron, con el tiempo que pasa cada una en el frontend, el backend y la base de datos."
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
          <div className="grid gap-2 @xl:grid-cols-[minmax(0,1fr)_10rem_auto_auto]">
            <SearchInput
              value={name}
              onValueChange={setName}
              placeholder="Filtrar por nombre: POST /rpc/*, cron.run..."
              label="Filtrar por nombre de la traza"
            />
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={minDuration}
              onChange={(event) => setMinDuration(event.target.value)}
              placeholder="Mín. ms"
              aria-label="Duración mínima en milisegundos"
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
          {data?.limitReached ? (
            <Text variant="compact" tone="muted" className="mt-2 block">
              Se muestran las {TRACE_SEARCH_LIMIT} trazas más recientes que
              coinciden. Acota las fechas o los filtros para ver las anteriores.
            </Text>
          ) : null}
        </div>
      }
      query={{ data: traces, isPending, isError, refetch }}
      loading="Buscando trazas..."
      error={{
        icon: <OctagonX className="size-6" />,
        title: "No se pudieron cargar las trazas",
        description:
          "Comprueba tu conexión y que Tempo esté disponible; después, vuelve a intentarlo.",
      }}
      // An open trace (a link from the activity log) can be older than the
      // list's window: keep the table and its panel instead of the empty state.
      isEmpty={(list) => list.length === 0 && !filtered && openTraceId === ""}
      empty={{
        icon: <ChartGantt className="size-6" />,
        title: "No hay trazas recientes",
        description:
          "Puede que el almacén de trazas no esté configurado (TEMPO_URL, OTEL_EXPORTER_OTLP_ENDPOINT) o que aún no se haya trazado ninguna petición en las últimas 24 horas.",
      }}
    >
      {() => (
        <div className="@container/traces flex min-h-0 flex-1 flex-col">
          <div
            className={cn(
              "grid min-h-0 flex-1 gap-6",
              openTraceId !== "" &&
                "@5xl/traces:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
            )}
          >
            <div className="flex min-h-0 flex-col">
              <DataTableView
                table={table}
                label="Trazas"
                idPrefix="admin-traces"
                onResetColumns={preferences.reset}
                filters={filters}
                renderControl={(trace, columnId) => {
                  if (columnId !== TRACE_NAME_COLUMN) return null
                  return (
                    <TraceNameCell
                      trace={trace}
                      open={trace.traceId === openTraceId}
                      onOpen={() => setTraceParam(trace.traceId)}
                    />
                  )
                }}
                emptyMessage={
                  <FilteredEmpty
                    message="Ninguna traza coincide con los filtros."
                    onClear={clearFilters}
                  />
                }
              />
            </div>
            {openTraceId !== "" ? (
              <aside className="min-h-0 overflow-y-auto rounded-lg border p-4">
                <TracePanel
                  key={openTraceId}
                  traceId={openTraceId}
                  onClose={() => {
                    setTraceParam("")
                    setFollowNewest(false)
                  }}
                />
              </aside>
            ) : null}
          </div>
        </div>
      )}
    </ResourceOverview>
  )
}
