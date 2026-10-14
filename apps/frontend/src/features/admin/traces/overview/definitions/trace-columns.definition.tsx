import { createColumnHelper } from "@tanstack/react-table"
import { Text } from "@/components/shared/brand/typography"
import { DataTableStatusCell } from "@/components/shared/data-display/data-table-cell-content"
import type { DataTableFilterOption } from "@/components/shared/data-display/data-table-column-filter"
import { StatusTag } from "@/components/shared/data-display/status-dot"
import {
  type TraceSummary,
  traceServicesLabel,
} from "@/features/admin/traces/shared"
import { columnLayoutOf, type DataTableFeatures } from "@/hooks/use-data-table"
import type { SortOrdering } from "@/hooks/use-sort-query-param"
import { formatDateTime, formatDurationMs } from "@/lib/format"
import type { SortValue } from "@/lib/sort-rows"

export const TRACE_SORT_KEYS = [
  "startTime",
  "rootName",
  "services",
  "duration",
  "errors",
] as const

export type TraceSortKey = (typeof TRACE_SORT_KEYS)[number]

export const TRACE_DEFAULT_SORT: SortOrdering<TraceSortKey> = {
  sort: "startTime",
  order: "desc",
}

/** The `errors` column's filter: one value, sent as `errorsOnly`. */
export const TRACE_ERROR_FILTER_VALUE = "error"

export const TRACE_ERROR_OPTIONS: DataTableFilterOption[] = [
  { value: TRACE_ERROR_FILTER_VALUE, label: "Con errores" },
]

/** Rendered by the page (`renderControl`): opening a trace sets the page's
 *  selection, which a module-level cell can't reach. */
export const TRACE_NAME_COLUMN = "rootName"

export function rootNameOf(trace: TraceSummary): string {
  if (trace.rootName === "") return "(span raíz pendiente)"
  return trace.rootName
}

/** The duration, tagged when the trace is an event stream: then it is how
 *  long the subscription stayed open, not how long a request took. */
function TraceDuration({ trace }: { trace: TraceSummary }) {
  const duration = (
    <Text variant="data">{formatDurationMs(trace.durationMs)}</Text>
  )
  if (!trace.streaming) return duration
  return (
    <span className="inline-flex items-center gap-2">
      <StatusTag title="Suscripción a eventos: dura lo que estuvo abierta">
        Stream
      </StatusTag>
      {duration}
    </span>
  )
}

function TraceErrors({ trace }: { trace: TraceSummary }) {
  if (trace.errorCount === 0) {
    return (
      <Text variant="data" tone="muted">
        —
      </Text>
    )
  }
  const label =
    trace.errorCount === 1 ? "1 error" : `${trace.errorCount} errores`
  return <DataTableStatusCell status={{ tone: "destructive", label }} />
}

const helper = createColumnHelper<DataTableFeatures, TraceSummary>()

export const traceColumns = helper.columns([
  helper.accessor(rootNameOf, {
    id: TRACE_NAME_COLUMN,
    header: "Traza",
    size: 280,
    minSize: 200,
    enableSorting: true,
    meta: {
      label: "Traza",
      reorderable: false,
      compact: "primary",
      rowRendered: true,
    },
  }),
  helper.accessor((trace) => traceServicesLabel(trace.services), {
    id: "services",
    header: "Servicios",
    size: 180,
    enableSorting: true,
    meta: { label: "Servicios", reorderable: true },
    cell: (info) => (
      <Text variant="status" tone="muted">
        {info.getValue()}
      </Text>
    ),
  }),
  helper.accessor((trace) => trace.startTime, {
    id: "startTime",
    header: "Inicio",
    size: 170,
    enableSorting: true,
    meta: { label: "Inicio", reorderable: true },
    cell: (info) => (
      <Text variant="data" tone="muted">
        {formatDateTime(info.getValue(), { includeSeconds: true })}
      </Text>
    ),
  }),
  helper.accessor((trace) => trace.durationMs, {
    id: "duration",
    header: "Duración",
    size: 150,
    enableSorting: true,
    meta: {
      label: "Duración",
      reorderable: true,
      cellClassName: "text-right tabular-nums",
      headerClassName: "text-right",
    },
    cell: (info) => <TraceDuration trace={info.row.original} />,
  }),
  helper.accessor((trace) => trace.errorCount, {
    id: "errors",
    header: "Errores",
    size: 110,
    enableSorting: true,
    meta: { label: "Errores", reorderable: true, compact: "status" },
    cell: (info) => <TraceErrors trace={info.row.original} />,
  }),
])

export const traceColumnLayout = columnLayoutOf(traceColumns)

export const traceSortValues: Partial<
  Record<TraceSortKey, SortValue<TraceSummary>>
> = {
  startTime: (trace) => trace.startTime,
  rootName: rootNameOf,
  services: (trace) => traceServicesLabel(trace.services),
  duration: (trace) => trace.durationMs,
  errors: (trace) => trace.errorCount,
}
