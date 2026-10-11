import { getIcon } from "@/lib/icon-registry"

const Clock = getIcon("navigation", "crons")

import type { OnChangeFn, SortingState } from "@tanstack/react-table"
import type { Ref, RefObject } from "react"
import { Text } from "@/components/shared/brand/typography"
import type { DataTableFilter } from "@/components/shared/data-display/data-table-column-filter"
import { DataTableView } from "@/components/shared/data-display/data-table-view"
import { InfiniteScrollSentinel } from "@/components/shared/data-display/infinite-scroll-sentinel"
import { StateCard } from "@/components/shared/feedback/state-card"
import { Button } from "@/components/ui/button"
import { CommentsButton, useCommentCounts } from "@/features/comments"
import { CronRunOutput } from "@/features/crons/detail/components/cron-run-output"
import {
  CRON_RUN_ACTIONS_COLUMN,
  CRON_RUN_STATUS_OPTIONS,
  type CronRun,
  cronRunColumnLayout,
  cronRunColumns,
  cronRunDay,
  cronRunDetailLabel,
  cronRunHasOutput,
  cronRunStartedAt,
} from "@/features/crons/detail/definitions/cron-run-columns.definition"
import { cronRunStatusLabels } from "@/features/crons/shared"
import { useColumnPreferences } from "@/hooks/use-column-preferences"
import { columnPreferenceProps, useDataTable } from "@/hooks/use-data-table"

/** The cron detail page's "Historial" section: the runs as a table sorted
 *  and filtered by the server (status filter in the "Estado" header), under
 *  one heading row per day while they are ordered by start time, with their
 *  infinite-scroll sentinel, or a loading or empty state. */
export function CronRunTimeline({
  runs,
  statusFilter,
  onStatusFilterChange,
  onClearFilters,
  isPending,
  hasNextPage,
  isFetchingNextPage,
  sentinelRef,
  scrollRef,
  sorting,
  onSortingChange,
}: {
  runs: CronRun[]
  /** The statuses kept, empty for every run. */
  statusFilter: readonly string[]
  onStatusFilterChange: (next: string[]) => void
  onClearFilters: () => void
  isPending: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  sentinelRef: RefObject<HTMLDivElement | null>
  /** Receives the table's scroll box, the sentinel's root. */
  scrollRef: Ref<HTMLDivElement>
  /** Owned by the page URL and applied by the server. */
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
}) {
  // One batched count for every loaded run instead of one request per row.
  const { data: commentCounts } = useCommentCounts(
    runs.map((run) => ({ entityType: "cron-run", entityId: run.id }))
  )
  const commentCountByRunId = new Map(
    commentCounts?.map((row) => [row.entityId, row.count])
  )
  const preferences = useColumnPreferences("cron-runs", cronRunColumnLayout)
  const table = useDataTable({
    data: runs,
    columns: cronRunColumns,
    getRowId: (run) => run.id,
    sorting,
    onSortingChange,
    ...columnPreferenceProps(preferences),
  })

  const filtered = statusFilter.length > 0
  const byStartTime = sorting[0]?.id === "startedAt"
  const groupOf = byStartTime ? cronRunDay : undefined
  const filters: Partial<Record<string, DataTableFilter>> = {
    status: {
      options: CRON_RUN_STATUS_OPTIONS,
      selected: statusFilter,
      onChange: onStatusFilterChange,
    },
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline gap-3">
        <Text as="h2" variant="title">
          Historial
        </Text>
        {runs.length > 0 ? (
          <Text as="p" variant="compact" tone="muted" className="tabular-nums">
            {runs.length}
            {hasNextPage ? "+" : ""}{" "}
            {runs.length === 1 ? "ejecución" : "ejecuciones"}
          </Text>
        ) : null}
      </div>

      {isPending ? (
        <StateCard spinner title="Cargando ejecuciones..." />
      ) : runs.length === 0 && !filtered ? (
        <StateCard
          icon={<Clock className="size-6" />}
          title="Sin ejecuciones todavía"
        />
      ) : (
        <DataTableView
          table={table}
          label="Historial de ejecuciones"
          idPrefix="cron-runs"
          onResetColumns={preferences.reset}
          scrollRef={scrollRef}
          scrollClassName="max-h-[70dvh]"
          groupOf={groupOf}
          filters={filters}
          emptyMessage={
            <div className="grid justify-items-center gap-2">
              <Text tone="muted">
                Ninguna ejecución coincide con los filtros.
              </Text>
              <Button variant="outline" size="sm" onClick={onClearFilters}>
                Limpiar filtros
              </Button>
            </div>
          }
          renderDetail={(run) => <CronRunOutput run={run} />}
          hasDetail={cronRunHasOutput}
          detailLabel={cronRunDetailLabel}
          renderControl={(run, columnId, expandToggle) => {
            if (columnId !== CRON_RUN_ACTIONS_COLUMN) return null
            const startedAt = cronRunStartedAt(run)
            return (
              <div className="flex items-center justify-end gap-1">
                <CommentsButton
                  compact
                  entity={{ entityType: "cron-run", entityId: run.id }}
                  count={commentCountByRunId.get(run.id) ?? 0}
                  title={`Comentarios · ${cronRunStatusLabels[run.status]}`}
                  description={`Ejecución iniciada el ${startedAt}`}
                  label={`Comentarios de la ejecución del ${startedAt}`}
                />
                {/* A fixed slot, so the comments buttons line up whether
                    or not the run has an error or a result to show. */}
                <span className="flex size-8 shrink-0 items-center justify-center">
                  {expandToggle}
                </span>
              </div>
            )
          }}
          footer={
            <InfiniteScrollSentinel
              sentinelRef={sentinelRef}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
            />
          }
        />
      )}
    </section>
  )
}
