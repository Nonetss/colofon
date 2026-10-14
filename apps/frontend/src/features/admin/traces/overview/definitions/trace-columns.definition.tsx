import { createColumnHelper } from "@tanstack/react-table"
import { Text } from "@/components/shared/brand/typography"
import { StatusTag } from "@/components/shared/data-display/status-dot"
import {
  type TraceSummary,
  traceServicesLabel,
} from "@/features/admin/traces/shared"
import { columnLayoutOf, type DataTableFeatures } from "@/hooks/use-data-table"
import { formatDurationMs } from "@/lib/format"

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

const helper = createColumnHelper<DataTableFeatures, TraceSummary>()

export const traceColumns = helper.columns([
  helper.accessor(rootNameOf, {
    id: TRACE_NAME_COLUMN,
    header: "Traza",
    size: 280,
    minSize: 200,
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
    // Compact rows show the services under the trace's name instead.
    meta: { label: "Servicios", reorderable: true, compact: "omit" },
    cell: (info) => (
      <Text variant="status" tone="muted">
        {info.getValue()}
      </Text>
    ),
  }),
  helper.accessor((trace) => trace.durationMs, {
    id: "duration",
    header: "Duración",
    size: 150,
    meta: {
      label: "Duración",
      reorderable: true,
      compact: "status",
      cellClassName: "text-right tabular-nums",
      headerClassName: "text-right",
    },
    cell: (info) => <TraceDuration trace={info.row.original} />,
  }),
])

export const traceColumnLayout = columnLayoutOf(traceColumns)
