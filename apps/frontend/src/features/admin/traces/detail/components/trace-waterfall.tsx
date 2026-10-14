import { getIcon } from "@/lib/icon-registry"

const ChevronRight = getIcon("controls", "next")
const ChevronDown = getIcon("controls", "expand")

import type { CSSProperties, ReactNode } from "react"
import { Text } from "@/components/shared/brand/typography"
import { StatusDot } from "@/components/shared/data-display/status-dot"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useWaterfallTree } from "@/features/admin/traces/detail/hooks/use-waterfall-tree"
import { spanBar } from "@/features/admin/traces/detail/model/trace-layout"
import type {
  BarSegment,
  WaterfallRow,
} from "@/features/admin/traces/detail/model/waterfall-tree"
import {
  type TraceSpan,
  traceServiceBarClass,
  traceServiceLabel,
} from "@/features/admin/traces/shared"
import { formatDurationMs } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Indent per nesting level of a row's name. */
const DEPTH_INDENT_REM = 0.875
/** Room left before the name for the fold chevron. */
const CHEVRON_REM = 1.25
/** The row's own left padding (`px-3`). */
const ROW_PADDING_REM = 0.75

const ROW_CLASS =
  "grid w-full gap-x-4 gap-y-1 px-3 py-1.5 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none @2xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] @2xl:items-center"

function dotToneOf(failed: boolean): "destructive" | "muted" {
  if (failed) return "destructive"
  return "muted"
}

function barClassOf(service: string, failed: boolean): string {
  if (failed) return "bg-destructive"
  return traceServiceBarClass(service)
}

function foldLabel(expanded: boolean, what: string): string {
  if (expanded) return `Plegar ${what}`
  return `Desplegar ${what}`
}

function internalSpansLabel(showInternal: boolean, hiddenCount: number) {
  if (showInternal || hiddenCount === 0) return "Spans internos de oRPC"
  return `Spans internos de oRPC (${hiddenCount} ocultos)`
}

function nameIndent(depth: number): CSSProperties {
  return { paddingLeft: `${depth * DEPTH_INDENT_REM + CHEVRON_REM}rem` }
}

function barStyle(
  bar: Pick<TraceSpan["bar"], "offsetMs" | "durationMs">,
  scaleMs: number
): CSSProperties {
  const position = spanBar({ ...bar, continues: false }, scaleMs)
  return { left: position.left, width: position.width }
}

/** A row's bar track: its own bar (if any), then the segments a folded row
 *  paints over it in each service's color. */
function SpanBar({
  bar,
  scaleMs,
  className,
  segments,
}: {
  bar: TraceSpan["bar"]
  scaleMs: number
  /** The row's own bar color; none draws only the segments. */
  className: string | null
  segments: readonly BarSegment[]
}) {
  return (
    <span className="relative h-2 min-w-0 flex-1 rounded-sm bg-muted">
      {className !== null ? (
        <span
          className={cn("absolute inset-y-0 rounded-sm", className)}
          style={barStyle(bar, scaleMs)}
        />
      ) : null}
      {segments.map((segment) => (
        <span
          key={`${segment.service}:${segment.failed}:${segment.offsetMs}`}
          className={cn(
            "absolute inset-y-0 rounded-sm",
            barClassOf(segment.service, segment.failed)
          )}
          style={barStyle(segment, scaleMs)}
        />
      ))}
      {bar.continues ? (
        <ChevronRight
          aria-hidden
          className="absolute top-1/2 -right-1 size-3 -translate-y-1/2 text-muted-foreground"
        />
      ) : null}
    </span>
  )
}

/** The chevron that opens or folds a row, laid over the row at its indent
 *  so it sits beside, not inside, the row's own button. */
function FoldToggle({
  depth,
  expanded,
  label,
  onToggle,
}: {
  depth: number
  expanded: boolean
  label: string
  onToggle: () => void
}) {
  const Icon = expanded ? ChevronDown : ChevronRight
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-label={label}
      onClick={onToggle}
      className="absolute top-1.5 z-10 flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      style={{ left: `${ROW_PADDING_REM + depth * DEPTH_INDENT_REM}rem` }}
    >
      <Icon aria-hidden className="size-3.5" />
    </button>
  )
}

function RowName({
  depth,
  failed,
  name,
  service,
  children,
}: {
  depth: number
  failed: boolean
  name: string
  service: string
  children?: ReactNode
}) {
  return (
    <span className="flex min-w-0 items-center gap-2" style={nameIndent(depth)}>
      <StatusDot tone={dotToneOf(failed)} className="shrink-0" />
      <Text variant="data" className="min-w-0 truncate">
        {name}
      </Text>
      {children}
      <Text variant="compact" tone="muted" className="shrink-0">
        {traceServiceLabel(service)}
      </Text>
    </span>
  )
}

function SpanRow({
  row,
  scaleMs,
  selected,
  onSelect,
  onToggle,
}: {
  row: Extract<WaterfallRow, { kind: "span" }>
  scaleMs: number
  selected: boolean
  onSelect: () => void
  onToggle: () => void
}) {
  const { span } = row
  const failed = span.status === "error"
  return (
    <li className="relative">
      {row.expandable ? (
        <FoldToggle
          depth={row.depth}
          expanded={row.expanded}
          label={foldLabel(row.expanded, span.name)}
          onToggle={onToggle}
        />
      ) : null}
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={cn(ROW_CLASS, selected && "bg-muted")}
      >
        <RowName
          depth={row.depth}
          failed={failed}
          name={span.name}
          service={span.service}
        />
        <span className="flex min-w-0 items-center gap-3">
          <SpanBar
            bar={span.bar}
            scaleMs={scaleMs}
            className={barClassOf(span.service, failed)}
            segments={row.segments}
          />
          <Text
            variant="data"
            tone="muted"
            className="w-16 shrink-0 text-right"
          >
            {formatDurationMs(span.durationMs)}
            {span.bar.continues ? (
              <span className="sr-only">, continúa después</span>
            ) : null}
          </Text>
        </span>
      </button>
    </li>
  )
}

function GroupRow({
  row,
  scaleMs,
  onToggle,
}: {
  row: Extract<WaterfallRow, { kind: "group" }>
  scaleMs: number
  onToggle: () => void
}) {
  const failed = row.errorCount > 0
  const count = row.spans.length
  return (
    <li className="relative">
      <FoldToggle
        depth={row.depth}
        expanded={row.expanded}
        label={foldLabel(row.expanded, `${count} spans ${row.name}`)}
        onToggle={onToggle}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onToggle}
        className={ROW_CLASS}
      >
        <RowName
          depth={row.depth}
          failed={failed}
          name={row.name}
          service={row.service}
        >
          <Text variant="compact" tone="muted" className="shrink-0">
            ×{count}
          </Text>
        </RowName>
        <span className="flex min-w-0 items-center gap-3">
          <SpanBar
            bar={row.bar}
            scaleMs={scaleMs}
            className={null}
            segments={row.segments}
          />
          <Text
            variant="data"
            tone="muted"
            className="w-16 shrink-0 text-right"
          >
            {formatDurationMs(row.totalMs)}
          </Text>
        </span>
      </button>
    </li>
  )
}

/**
 * The trace as a waterfall: spans in the order `traces.get` returns
 * (depth-first), each name indented by depth and its `bar` placed and sized
 * against `scaleMs` (the request, for a stream), with a mark when the span
 * runs on past the edge. oRPC's per-call plumbing is hidden unless asked,
 * runs of same-named siblings fold into one row with their count and total
 * time, and spans open level by level only as far as the outline stays
 * short. Span rows select the span whose attributes the page shows below.
 */
export function TraceWaterfall({
  spans,
  scaleMs,
  selectedSpanId,
  onSelect,
}: {
  spans: readonly TraceSpan[]
  scaleMs: number
  selectedSpanId: string | null
  onSelect: (spanId: string) => void
}) {
  const {
    rows,
    hiddenCount,
    showInternal,
    setShowInternal,
    toggle,
    expandAll,
    collapseAll,
  } = useWaterfallTree(spans, scaleMs)

  return (
    <section aria-label="Cascada de spans" className="@container">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-h-8 items-center gap-2">
          <Switch
            id="trace-waterfall-internal"
            checked={showInternal}
            onCheckedChange={(checked) => setShowInternal(checked === true)}
          />
          <Text
            as="label"
            variant="compact"
            tone="muted"
            htmlFor="trace-waterfall-internal"
          >
            {internalSpansLabel(showInternal, hiddenCount)}
          </Text>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="xs" onClick={expandAll}>
            Desplegar todo
          </Button>
          <Button variant="ghost" size="xs" onClick={collapseAll}>
            Plegar todo
          </Button>
        </div>
      </div>
      <div className="mb-1 hidden grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-3 @2xl:grid">
        <Text variant="label" tone="muted">
          Span
        </Text>
        <Text variant="label" tone="muted" className="flex justify-between">
          <span>0 ms</span>
          <span>{formatDurationMs(scaleMs)}</span>
        </Text>
      </div>
      <ul className="max-h-[60vh] divide-y divide-border/60 overflow-y-auto rounded-md border">
        {rows.map((row) => {
          if (row.kind === "group") {
            return (
              <GroupRow
                key={row.key}
                row={row}
                scaleMs={scaleMs}
                onToggle={() => toggle(row.key)}
              />
            )
          }
          return (
            <SpanRow
              key={row.key}
              row={row}
              scaleMs={scaleMs}
              selected={row.span.spanId === selectedSpanId}
              onSelect={() => onSelect(row.span.spanId)}
              onToggle={() => toggle(row.key)}
            />
          )
        })}
      </ul>
    </section>
  )
}
