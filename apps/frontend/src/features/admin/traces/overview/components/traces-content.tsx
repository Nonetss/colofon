import { getIcon } from "@/lib/icon-registry"

const OctagonX = getIcon("status", "error")
const ChartGantt = getIcon("admin", "traces")
const RotateCw = getIcon("actions", "refresh")

import { useMemo, useState } from "react"
import { Text } from "@/components/shared/brand/typography"
import type { DataTableFilter } from "@/components/shared/data-display/data-table-column-filter"
import { DataTableView } from "@/components/shared/data-display/data-table-view"
import { FilteredEmpty } from "@/components/shared/data-display/filtered-empty"
import { SearchInput } from "@/components/shared/form/search-input"
import { ResourceOverview } from "@/components/shared/resource/resource-overview"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import {
  TRACE_DEFAULT_SORT,
  TRACE_ERROR_FILTER_VALUE,
  TRACE_ERROR_OPTIONS,
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

  return (
    <ResourceOverview
      maxWidth="80%"
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
      isEmpty={(list) => list.length === 0 && !filtered}
      empty={{
        icon: <ChartGantt className="size-6" />,
        title: "No hay trazas recientes",
        description:
          "Puede que el almacén de trazas no esté configurado (TEMPO_URL, OTEL_EXPORTER_OTLP_ENDPOINT) o que aún no se haya trazado ninguna petición en las últimas 24 horas.",
      }}
    >
      {() => (
        <DataTableView
          table={table}
          label="Trazas"
          idPrefix="admin-traces"
          onResetColumns={preferences.reset}
          filters={filters}
          emptyMessage={
            <FilteredEmpty
              message="Ninguna traza coincide con los filtros."
              onClear={clearFilters}
            />
          }
        />
      )}
    </ResourceOverview>
  )
}
