import { createColumnHelper } from "@tanstack/react-table"
import { Text } from "@/components/shared/brand/typography"
import type { DataTableFilterOption } from "@/components/shared/data-display/data-table-column-filter"
import {
  StatusDot,
  type StatusDotTone,
} from "@/components/shared/data-display/status-dot"
import type { CronRunStatus, useCronRuns } from "@/features/crons/shared"
import { cronRunStatusLabels } from "@/features/crons/shared"
import { columnLayoutOf, type DataTableFeatures } from "@/hooks/use-data-table"
import type { SortOrdering } from "@/hooks/use-sort-query-param"
import {
  formatDateTime,
  formatDayHeader,
  formatDayLabel,
  formatDuration,
  formatTime,
} from "@/lib/format"

export type CronRun = NonNullable<
  ReturnType<typeof useCronRuns>["data"]
>["pages"][number]["runs"][number]

/** The orderings `cron.listRuns` accepts (its `sort` input). */
export const CRON_RUN_SORT_KEYS = ["startedAt", "status", "duration"] as const

export type CronRunSortKey = (typeof CRON_RUN_SORT_KEYS)[number]

export const CRON_RUN_DEFAULT_SORT: SortOrdering<CronRunSortKey> = {
  sort: "startedAt",
  order: "desc",
}

/** The row's comments button and its error/result toggle. */
export const CRON_RUN_ACTIONS_COLUMN = "actions"

const statusDotTone: Record<CronRunStatus, StatusDotTone> = {
  success: "foreground",
  failed: "destructive",
  running: "primary",
  skipped: "muted",
}

/** Whether the run carries an error or a result to disclose. */
export function cronRunHasOutput(run: CronRun): boolean {
  if (run.errorMessage) return true
  return run.result !== null && run.result !== undefined
}

export function cronRunStartedAt(run: CronRun): string {
  return formatDateTime(run.startedAt, {
    includeSeconds: true,
    includeYear: true,
  })
}

export function cronRunDetailLabel(run: CronRun): string {
  if (run.errorMessage)
    return `Ver error de la ejecución del ${cronRunStartedAt(run)}`
  return `Ver resultado de la ejecución del ${cronRunStartedAt(run)}`
}

/** The status filter's values, in the order the status sort ranks them. */
const STATUS_RANK_ORDER: CronRunStatus[] = [
  "running",
  "failed",
  "skipped",
  "success",
]

export const CRON_RUN_STATUS_OPTIONS: DataTableFilterOption[] =
  STATUS_RANK_ORDER.map((status) => ({
    value: status,
    label: cronRunStatusLabels[status],
  }))

const RUN_STATUSES: readonly string[] = [
  "running",
  "success",
  "failed",
  "skipped",
]

/** The statuses kept in the URL that name a real status. */
export function runStatusesOf(values: readonly string[]): CronRunStatus[] {
  return values.filter((value): value is CronRunStatus =>
    RUN_STATUSES.includes(value)
  )
}

/** The day heading a run goes under: one per local calendar day. */
export function cronRunDay(run: CronRun) {
  return {
    key: new Date(run.startedAt).toDateString(),
    heading: formatDayHeader(formatDayLabel(run.startedAt)),
  }
}

function durationOf(run: CronRun): string {
  if (!run.finishedAt) return "en curso"
  return formatDuration(run.startedAt, run.finishedAt)
}

const helper = createColumnHelper<DataTableFeatures, CronRun>()

export const cronRunColumns = helper.columns([
  helper.accessor((run) => run.status, {
    id: "status",
    header: "Estado",
    size: 150,
    minSize: 120,
    enableSorting: true,
    meta: { label: "Estado", reorderable: false, compact: "primary" },
    cell: (info) => (
      <span className="flex items-center gap-3">
        <StatusDot
          tone={statusDotTone[info.row.original.status]}
          pulse={info.row.original.status === "running"}
          className="size-2 shrink-0"
        />
        <Text variant="title">
          {cronRunStatusLabels[info.row.original.status]}
        </Text>
      </span>
    ),
  }),
  helper.accessor((run) => run.startedAt, {
    id: "startedAt",
    header: "Inicio",
    size: 140,
    enableSorting: true,
    meta: { label: "Inicio", reorderable: true },
    cell: (info) => (
      <Text variant="data" tone="muted">
        {formatTime(info.row.original.startedAt, { includeSeconds: true })}
      </Text>
    ),
  }),
  helper.accessor(durationOf, {
    id: "duration",
    header: "Duración",
    size: 130,
    enableSorting: true,
    meta: {
      label: "Duración",
      reorderable: true,
      cellClassName: "text-right",
      headerClassName: "text-right",
    },
    cell: (info) => <Text variant="data">{info.getValue()}</Text>,
  }),
  helper.display({
    id: CRON_RUN_ACTIONS_COLUMN,
    header: "Acciones",
    size: 120,
    minSize: 100,
    meta: {
      label: "Acciones",
      reorderable: false,
      cellClassName: "text-right",
      headerClassName: "text-right",
    },
  }),
])

export const cronRunColumnLayout = columnLayoutOf(cronRunColumns)
