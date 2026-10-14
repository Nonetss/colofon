import { getIcon } from "@/lib/icon-registry"

const OctagonX = getIcon("status", "error")
const ChartGantt = getIcon("admin", "traces")
const RotateCw = getIcon("actions", "refresh")

import type { OnChangeFn, SortingState } from "@tanstack/react-table"
import { useState } from "react"
import { Text } from "@/components/shared/brand/typography"
import { DataTableIdentityCell } from "@/components/shared/data-display/data-table-cell-content"
import type { DataTableFilter } from "@/components/shared/data-display/data-table-column-filter"
import { DataTableView } from "@/components/shared/data-display/data-table-view"
import { FilteredEmpty } from "@/components/shared/data-display/filtered-empty"
import { InfiniteScrollSentinel } from "@/components/shared/data-display/infinite-scroll-sentinel"
import { StatusDot } from "@/components/shared/data-display/status-dot"
import {
  type ResourceFilterDescriptor,
  ResourceFilters,
} from "@/components/shared/resource/resource-filters"
import { ResourceOverview } from "@/components/shared/resource/resource-overview"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { TracePanel } from "@/features/admin/traces/detail"
import { TraceNameFilter } from "@/features/admin/traces/overview/components/trace-name-filter"
import {
  rootNameOf,
  TRACE_NAME_COLUMN,
  traceColumnLayout,
  traceColumns,
} from "@/features/admin/traces/overview/definitions/trace-columns.definition"
import { useMinWidth } from "@/features/admin/traces/overview/hooks/use-min-width"
import { useTraceRootNames } from "@/features/admin/traces/overview/hooks/use-trace-root-names"
import { useTraceSearch } from "@/features/admin/traces/overview/hooks/use-trace-search"
import {
  TRACE_SERVICE_OPTIONS,
  type TraceSummary,
  traceServicesLabel,
  traceServicesOf,
} from "@/features/admin/traces/shared"
import { useColumnPreferences } from "@/hooks/use-column-preferences"
import { columnPreferenceProps, useDataTable } from "@/hooks/use-data-table"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  NO_VALUES,
  useQueryParam,
  valueListCodec,
} from "@/hooks/use-query-param"
import { cn } from "@/lib/utils"

const TRACE_ID_PATTERN = /^[0-9a-f]{32}$/

/** From this width (`@5xl`) the open trace sits beside the list; below it
 *  the list fills the page and a picked trace opens in a sheet over it. */
const SIDE_PANEL_MIN_REM = 64

/** `?errors=` while the list keeps only traces with errors (`errorsOnly`). */
const ERRORS_ONLY_PARAM = "error"

/** Tempo only answers newest first, and every page continues that order,
 *  so the table has no sort to change. */
const NO_SORTING: SortingState = []

const keepNoSorting: OnChangeFn<SortingState> = () => {}

/** The open trace from `?trace=` (links from the activity log land here);
 *  anything that isn't a trace id opens nothing. */
function traceIdOf(param: string): string {
  if (TRACE_ID_PATTERN.test(param)) return param
  return ""
}

/**
 * The trace the side panel shows: the one in the URL, else the newest of
 * the list (the first of its first page). The
 * newest one stays out of the URL, so a refresh keeps following the latest
 * request.
 */
function openTraceOf(chosen: string, traces: readonly TraceSummary[]): string {
  if (chosen !== "") return chosen
  const newest = traces[0]
  if (newest === undefined) return ""
  return newest.traceId
}

/** The open-trace mark, only where the open trace stays in view beside
 *  the list; over it (the sheet) the mark would just indent every row. */
function openMarkOf(beside: boolean, open: boolean) {
  if (!beside) return undefined
  return <StatusDot tone="primary" className={cn(!open && "invisible")} />
}

/** The trace's name cell: opens it, and marks the open one. Compact rows
 *  (the list alone, below `@4xl`) leave out the services column, so the
 *  cell shows them over the id instead. */
function TraceNameCell({
  trace,
  open,
  beside,
  onOpen,
}: {
  trace: TraceSummary
  open: boolean
  beside: boolean
  onOpen: () => void
}) {
  return (
    <DataTableIdentityCell
      primary={rootNameOf(trace)}
      secondary={
        <>
          {beside ? null : (
            <span className="@4xl/table:hidden">
              {traceServicesLabel(trace.services)} ·{" "}
            </span>
          )}
          <span className="font-mono">{trace.traceId.slice(0, 16)}</span>
        </>
      }
      onOpen={onOpen}
      label={`Ver la traza ${rootNameOf(trace)}`}
      leading={openMarkOf(beside, open)}
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
  const [serviceParam, setServiceParam] = useQueryParam(
    "services",
    NO_VALUES,
    valueListCodec
  )
  const [errorsParam, setErrorsParam] = useQueryParam("errors", "")
  const [nameParam, setNameParam] = useQueryParam(
    "names",
    NO_VALUES,
    valueListCodec
  )
  const [traceParam, setTraceParam] = useQueryParam("trace", "")
  const chosenTraceId = traceIdOf(traceParam)
  const [minDuration, setMinDuration] = useState("")
  const [from, setFrom] = useState<Date | undefined>(undefined)
  const [to, setTo] = useState<Date | undefined>(undefined)
  const debouncedMinDuration = useDebouncedValue(minDuration)

  // Unknown values in the URL are dropped instead of emptying the list.
  const services = traceServicesOf(serviceParam)
  const errorsOnly = errorsParam === ERRORS_ONLY_PARAM
  const minDurationMs = minDurationOf(debouncedMinDuration)

  const {
    traces,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isPending,
    isError,
    refetch,
    isRefetching,
  } = useTraceSearch({
    services,
    errorsOnly,
    minDurationMs,
    names: nameParam,
    from,
    to,
  })
  const rootNames = useTraceRootNames({ from, to }, nameParam)
  const openTraceId = openTraceOf(chosenTraceId, traces)
  const preferences = useColumnPreferences("admin-traces", traceColumnLayout)
  const table = useDataTable({
    data: traces,
    columns: traceColumns,
    getRowId: (trace) => trace.traceId,
    sorting: NO_SORTING,
    onSortingChange: keepNoSorting,
    ...columnPreferenceProps(preferences),
  })

  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(
    null
  )
  const isMobile = useIsMobile()
  const [listArea, setListArea] = useState<HTMLDivElement | null>(null)
  const sidePanel = useMinWidth(listArea, SIDE_PANEL_MIN_REM)
  // Without the side panel only a picked trace opens (in the sheet): the
  // newest one would cover the list as soon as the page loads.
  const shownTraceId = sidePanel ? openTraceId : chosenTraceId
  const sentinelRef = useInfiniteScroll(
    scrollContainer,
    fetchNextPage,
    hasNextPage && !isFetchingNextPage
  )

  const filtered =
    services.length > 0 ||
    errorsOnly ||
    minDurationMs !== undefined ||
    nameParam.length > 0 ||
    from !== undefined ||
    to !== undefined
  const clearFilters = () => {
    setServiceParam(NO_VALUES)
    setErrorsParam("")
    setNameParam(NO_VALUES)
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
    services: {
      options: TRACE_SERVICE_OPTIONS,
      selected: services,
      onChange: valuesSetter(setServiceParam),
    },
  }
  const setErrorsOnly = (checked: boolean) => {
    if (checked) {
      setErrorsParam(ERRORS_ONLY_PARAM)
      return
    }
    setErrorsParam("")
  }

  const nameFilter = (
    <TraceNameFilter
      groups={rootNames}
      selected={nameParam}
      onChange={valuesSetter(setNameParam)}
    />
  )
  const minDurationInput = (
    <Input
      type="number"
      inputMode="numeric"
      min={0}
      value={minDuration}
      onChange={(event) => setMinDuration(event.target.value)}
      placeholder="Mín. ms"
      aria-label="Duración mínima en milisegundos"
    />
  )
  const errorsSwitch = (
    <div className="flex min-h-8 items-center gap-2">
      <Switch
        id="admin-traces-errors-only"
        checked={errorsOnly}
        onCheckedChange={(checked) => setErrorsOnly(checked === true)}
      />
      <Text
        as="label"
        variant="compact"
        tone="muted"
        htmlFor="admin-traces-errors-only"
      >
        Con errores
      </Text>
    </div>
  )
  // Below `md` the same filters move to the bottom action bar and its sheet.
  const filterDescriptors: ResourceFilterDescriptor[] = [
    {
      key: "names",
      kind: "custom",
      label: "Traza",
      isActive: nameParam.length > 0,
      render: () => nameFilter,
    },
    {
      key: "services",
      kind: "facet",
      label: "Servicios",
      options: TRACE_SERVICE_OPTIONS,
      value: { include: services, exclude: [] },
      onChange: (next) => valuesSetter(setServiceParam)(next.include),
      // Tempo's search can only require a service, not rule one out.
      excludable: false,
    },
    {
      key: "minDuration",
      kind: "custom",
      label: "Duración mínima (ms)",
      isActive: minDuration.trim() !== "",
      render: () => minDurationInput,
    },
    {
      key: "from",
      kind: "date",
      label: "Desde",
      value: from,
      onChange: setFrom,
      placeholder: "Desde",
    },
    {
      key: "to",
      kind: "date",
      label: "Hasta",
      value: to,
      onChange: setTo,
      placeholder: "Hasta",
    },
    {
      key: "errors",
      kind: "custom",
      label: "Errores",
      isActive: errorsOnly,
      render: () => errorsSwitch,
    },
  ]

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
        isMobile ? (
          <ResourceFilters filters={filterDescriptors} onClear={clearFilters} />
        ) : (
          <div className="@container">
            <div className="grid gap-2 @md:grid-cols-2 @4xl:grid-cols-[minmax(0,1fr)_10rem_auto_auto_auto]">
              <div className="min-w-0 @md:col-span-2 @4xl:col-span-1">
                {nameFilter}
              </div>
              {minDurationInput}
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
              {errorsSwitch}
            </div>
          </div>
        )
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
        <div ref={setListArea} className="flex min-h-0 flex-1 flex-col">
          {/* Beside the panel the list keeps the table layout, scrolling
              sideways when it doesn't fit; alone it turns into compact rows
              when narrow. */}
          <div
            className={cn(
              "grid min-h-0 flex-1 gap-6",
              sidePanel &&
                openTraceId !== "" &&
                "grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
            )}
          >
            <div className="flex min-h-0 flex-col">
              <DataTableView
                table={table}
                layout={sidePanel ? "table" : "responsive"}
                label="Trazas"
                idPrefix="admin-traces"
                onResetColumns={preferences.reset}
                scrollRef={setScrollContainer}
                // On mobile the services filter lives in the filter sheet.
                filters={isMobile ? undefined : filters}
                renderControl={(trace, columnId) => {
                  if (columnId !== TRACE_NAME_COLUMN) return null
                  return (
                    <TraceNameCell
                      trace={trace}
                      open={trace.traceId === shownTraceId}
                      beside={sidePanel}
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
                footer={
                  <InfiniteScrollSentinel
                    sentinelRef={sentinelRef}
                    hasNextPage={hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                  />
                }
              />
            </div>
            {sidePanel && openTraceId !== "" ? (
              <aside className="min-h-0 overflow-y-auto rounded-lg border p-4">
                <TracePanel key={openTraceId} traceId={openTraceId} />
              </aside>
            ) : null}
          </div>
          <Sheet
            open={!sidePanel && chosenTraceId !== ""}
            onOpenChange={(open) => {
              if (!open) setTraceParam("")
            }}
          >
            <SheetContent className="w-full gap-0 sm:max-w-3xl">
              <SheetHeader>
                <SheetTitle>Traza</SheetTitle>
                <SheetDescription className="sr-only">
                  Cascada de spans y detalle de la traza
                </SheetDescription>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                {chosenTraceId !== "" ? (
                  <TracePanel key={chosenTraceId} traceId={chosenTraceId} />
                ) : null}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </ResourceOverview>
  )
}
