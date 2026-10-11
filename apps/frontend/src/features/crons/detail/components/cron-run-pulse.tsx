import { barY, defineChart } from "@tanstack/charts"
import { scaleBand } from "@tanstack/charts/scales/band"
import { scaleLinear } from "@tanstack/charts/scales/linear"
import { tooltip } from "@tanstack/charts/tooltip"
import { useMemo } from "react"
import { Text } from "@/components/shared/brand/typography"
import { MetadataCell } from "@/components/shared/data-display/metadata-cell"
import { Chart } from "@/components/ui/chart"
import {
  buildRunPulse,
  type PulseBar,
  type PulseRun,
} from "@/features/crons/detail/model/run-pulse"
import type { CronRunStatus } from "@/features/crons/shared"
import { cronRunStatusLabels } from "@/features/crons/shared"
import { useIsMobile } from "@/hooks/use-mobile"
import { formatDateTime, formatDurationMs } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Bars drawn below `md`, so each mark stays legible at phone width. */
const MOBILE_BAR_COUNT = 24

/** Height of the bar strip in pixels. */
const PULSE_HEIGHT = 56

/** Status paints, shared by the chart's bars and the legend swatches. */
const statusFill: Record<CronRunStatus, string> = {
  success: "color-mix(in oklab, var(--foreground) 30%, transparent)",
  failed: "var(--destructive)",
  skipped: "color-mix(in oklab, var(--muted-foreground) 45%, transparent)",
  running: "var(--primary)",
}

const legend: { status: CronRunStatus; swatch: string }[] = [
  { status: "success", swatch: "size-2" },
  { status: "failed", swatch: "size-2" },
  { status: "skipped", swatch: "h-0.5 w-2" },
]

const percentFormat = new Intl.NumberFormat("es-ES", {
  style: "percent",
  maximumFractionDigits: 1,
})

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}

/** "Correcta · 10/10/2026 12:00:03 · 1.2 s"; no duration while running. */
function pulseBarLabel(bar: PulseBar) {
  const parts = [
    cronRunStatusLabels[bar.status],
    formatDateTime(bar.startedAt, { includeSeconds: true }),
  ]
  if (bar.durationMs !== null) parts.push(formatDurationMs(bar.durationMs))
  return parts.join(" · ")
}

/** The bars the strip draws: all of them, or the newest few on a phone. */
function visiblePulseBars(bars: PulseBar[], isMobile: boolean) {
  if (!isMobile) return bars
  return bars.slice(-MOBILE_BAR_COUNT)
}

/** One bar per run, oldest to newest: height = `heightPct`, paint = status. */
function pulseChart(bars: PulseBar[]) {
  return defineChart({
    marks: [
      barY(bars, {
        x: "id",
        y: "heightPct",
        fill: (bar) => statusFill[bar.status],
        inset: 1.5,
        radius: 1,
      }),
    ],
    scales: {
      x: { scale: scaleBand, axis: false },
      y: { scale: scaleLinear().domain([0, 100]), axis: false },
    },
    focus: "nearest-x",
    tooltip: { use: tooltip, format: (point) => pulseBarLabel(point.datum) },
  })
}

/** The cron detail page's "Pulso" section: one bar per recent run (height =
 *  duration, tone = status) plus success rate, streak and p50/p95. */
export function CronRunPulse({ runs }: { runs: PulseRun[] }) {
  const isMobile = useIsMobile()
  const { bars, stats } = useMemo(() => buildRunPulse(runs), [runs])
  const visibleBars = useMemo(
    () => visiblePulseBars(bars, isMobile),
    [bars, isMobile]
  )
  const definition = useMemo(() => pulseChart(visibleBars), [visibleBars])
  const { counts } = stats
  const oldest = visibleBars[0]
  const newest = visibleBars.at(-1)
  const summary = [
    plural(stats.total, "ejecución", "ejecuciones"),
    plural(counts.success, "correcta", "correctas"),
    plural(counts.failed, "fallida", "fallidas"),
    plural(counts.skipped, "omitida", "omitidas"),
    counts.running > 0 ? `${counts.running} en curso` : null,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="flex items-baseline gap-3">
          <Text as="h2" variant="title">
            Pulso
          </Text>
          <Text as="p" variant="compact" tone="muted" className="tabular-nums">
            Últimas {plural(stats.total, "ejecución", "ejecuciones")}
          </Text>
        </div>
        <ul className="flex items-center gap-4">
          {legend.map(({ status, swatch }) => (
            <Text
              key={status}
              as="li"
              variant="label"
              tone="muted"
              className="flex items-center gap-1.5"
            >
              <span
                aria-hidden
                className={cn("rounded-[1px]", swatch)}
                style={{ background: statusFill[status] }}
              />
              {cronRunStatusLabels[status]}
            </Text>
          ))}
        </ul>
      </div>

      <div className="flex flex-col rounded-xl border bg-card/40 md:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-2 p-4 sm:p-5">
          <Chart
            definition={definition}
            ariaLabel={summary}
            height={PULSE_HEIGHT}
          />
          <div className="flex justify-between">
            <Text variant="data" tone="muted">
              {formatDateTime(oldest?.startedAt ?? null)}
            </Text>
            <Text variant="data" tone="muted">
              {formatDateTime(newest?.startedAt ?? null)}
            </Text>
          </div>
        </div>

        <dl className="grid grid-cols-2 border-t md:w-80 md:shrink-0 md:border-t-0 md:border-l">
          <MetadataCell as="dl" label="Tasa de éxito" className="border-b p-4">
            <Text variant="stat">
              {stats.successRate === null
                ? "—"
                : percentFormat.format(stats.successRate)}
            </Text>
          </MetadataCell>
          <MetadataCell
            as="dl"
            label="Racha actual"
            className="border-b border-l p-4"
          >
            <span className="flex items-baseline gap-1.5">
              <Text variant="stat">{stats.streak}</Text>
              <Text variant="compact" tone="muted">
                {stats.streak === 1 ? "correcta" : "correctas"}
              </Text>
            </span>
          </MetadataCell>
          <MetadataCell as="dl" label="Duración p50" className="p-4">
            <Text variant="data">
              {stats.p50Ms === null ? "—" : formatDurationMs(stats.p50Ms)}
            </Text>
          </MetadataCell>
          <MetadataCell as="dl" label="Duración p95" className="border-l p-4">
            <Text variant="data">
              {stats.p95Ms === null ? "—" : formatDurationMs(stats.p95Ms)}
            </Text>
          </MetadataCell>
        </dl>
      </div>
    </section>
  )
}
