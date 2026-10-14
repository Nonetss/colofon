import { createColumnHelper } from "@tanstack/react-table"
import { Text } from "@/components/shared/brand/typography"
import {
  DataTableIdentityCell,
  DataTableStatusCell,
} from "@/components/shared/data-display/data-table-cell-content"
import type { DataTableFilterOption } from "@/components/shared/data-display/data-table-column-filter"
import {
  type TraceSummary,
  traceServiceLabel,
} from "@/features/admin/traces/shared"
import { columnLayoutOf, type DataTableFeatures } from "@/hooks/use-data-table"
import type { SortOrdering } from "@/hooks/use-sort-query-param"
import { formatDateTime, formatDurationMs } from "@/lib/format"
import type { SortValue } from "@/lib/sort-rows"

export const TRACE_SORT_KEYS = [
  "startTime",
  "rootName",
  "service",
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

export function traceHref(trace: Pick<TraceSummary, "traceId">): string {
  return `/admin/traces/${trace.traceId}`
}

function rootNameOf(trace: TraceSummary): string {
  if (trace.rootName === "") return "(span raíz pendiente)"
  return trace.rootName
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
    id: "rootName",
    header: "Traza",
    size: 340,
    minSize: 200,
    enableSorting: true,
    meta: { label: "Traza", reorderable: false, compact: "primary" },
    cell: (info) => (
      <DataTableIdentityCell
        primary={info.getValue()}
        secondary={
          <span className="font-mono">
            {info.row.original.traceId.slice(0, 16)}
          </span>
        }
        href={traceHref(info.row.original)}
        label={`Ver la traza ${info.getValue()}`}
      />
    ),
  }),
  helper.accessor((trace) => traceServiceLabel(trace.rootService), {
    id: "service",
    header: "Servicio",
    size: 130,
    enableSorting: true,
    meta: { label: "Servicio", reorderable: true },
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
    size: 110,
    enableSorting: true,
    meta: {
      label: "Duración",
      reorderable: true,
      cellClassName: "text-right tabular-nums",
      headerClassName: "text-right",
    },
    cell: (info) => (
      <Text variant="data">{formatDurationMs(info.getValue())}</Text>
    ),
  }),
  helper.accessor((trace) => trace.errorCount, {
    id: "errors",
    header: "Errores",
    size: 130,
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
  service: (trace) => traceServiceLabel(trace.rootService),
  duration: (trace) => trace.durationMs,
  errors: (trace) => trace.errorCount,
}
