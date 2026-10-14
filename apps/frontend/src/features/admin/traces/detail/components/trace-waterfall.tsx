import { Text } from "@/components/shared/brand/typography"
import { StatusDot } from "@/components/shared/data-display/status-dot"
import { spanBar } from "@/features/admin/traces/detail/model/trace-layout"
import {
  type TraceSpan,
  traceServiceBarClass,
  traceServiceLabel,
} from "@/features/admin/traces/shared"
import { formatDurationMs } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Indent per nesting level of a span's name. */
const DEPTH_INDENT_REM = 0.875

function dotToneOf(span: TraceSpan): "destructive" | "muted" {
  if (span.status === "error") return "destructive"
  return "muted"
}

function barClassOf(span: TraceSpan): string {
  if (span.status === "error") return "bg-destructive"
  return traceServiceBarClass(span.service)
}

/**
 * The trace as a waterfall: one row per span in the order `traces.get`
 * returns (depth-first), the name indented by depth and a bar placed and
 * sized against the whole trace. Rows are buttons that select the span
 * whose attributes the page shows below.
 */
export function TraceWaterfall({
  spans,
  durationMs,
  selectedSpanId,
  onSelect,
}: {
  spans: readonly TraceSpan[]
  durationMs: number
  selectedSpanId: string | null
  onSelect: (spanId: string) => void
}) {
  return (
    <section aria-label="Cascada de spans" className="@container">
      <div className="mb-1 hidden grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-3 @2xl:grid">
        <Text variant="label" tone="muted">
          Span
        </Text>
        <Text variant="label" tone="muted" className="flex justify-between">
          <span>0 ms</span>
          <span>{formatDurationMs(durationMs)}</span>
        </Text>
      </div>
      <ul className="divide-y divide-border/60 overflow-hidden rounded-md border">
        {spans.map((span) => {
          const selected = span.spanId === selectedSpanId
          const bar = spanBar(span, durationMs)
          return (
            <li key={span.spanId}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(span.spanId)}
                className={cn(
                  "grid w-full gap-x-4 gap-y-1 px-3 py-1.5 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none @2xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] @2xl:items-center",
                  selected && "bg-muted"
                )}
              >
                <span
                  className="flex min-w-0 items-center gap-2"
                  style={{ paddingLeft: `${span.depth * DEPTH_INDENT_REM}rem` }}
                >
                  <StatusDot tone={dotToneOf(span)} className="shrink-0" />
                  <Text variant="data" className="min-w-0 truncate">
                    {span.name}
                  </Text>
                  <Text variant="compact" tone="muted" className="shrink-0">
                    {traceServiceLabel(span.service)}
                  </Text>
                </span>
                <span className="flex min-w-0 items-center gap-3">
                  <span className="relative h-2 min-w-0 flex-1 rounded-sm bg-muted">
                    <span
                      className={cn(
                        "absolute inset-y-0 rounded-sm",
                        barClassOf(span)
                      )}
                      style={{ left: bar.left, width: bar.width }}
                    />
                  </span>
                  <Text
                    variant="data"
                    tone="muted"
                    className="w-16 shrink-0 text-right"
                  >
                    {formatDurationMs(span.durationMs)}
                  </Text>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
