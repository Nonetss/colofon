import { type ReactNode, useMemo } from "react"
import type { DataTableFilter } from "@/components/shared/data-display/data-table-column-filter"
import { DataTableView } from "@/components/shared/data-display/data-table-view"
import { RowActions } from "@/components/shared/data-display/row-action-items"
import {
  CRON_ACTIONS_COLUMN,
  CRON_DEFAULT_SORT,
  CRON_NAME_COLUMN,
  CRON_RUNS_AS_COLUMN,
  CRON_SORT_KEYS,
  CronJobIdentity,
  CronJobRunsAsCell,
  CronRowTrailingActions,
  type CronsRowContext,
  cronJobActions,
  cronJobColumnLayout,
  cronJobColumns,
  cronJobSortValues,
  isMutedJob,
} from "@/features/crons/overview/definitions/cron-job-columns.definition"
import type { CronJob } from "@/features/crons/shared"
import { useColumnPreferences } from "@/hooks/use-column-preferences"
import { columnPreferenceProps, useDataTable } from "@/hooks/use-data-table"
import { useSortQueryParam } from "@/hooks/use-sort-query-param"
import { sortRows } from "@/lib/sort-rows"

/**
 * The `/crons` jobs as one data table, with each job's tag as a column and
 * the page's filters in a row under the column titles: the column layout is
 * saved per browser, the sort lives in the URL and is applied in the
 * browser after the filters.
 */
export function CronJobsTable({
  jobs,
  context,
  filters,
  emptyMessage,
}: {
  jobs: CronJob[]
  context: CronsRowContext
  /** The page's Excel-style column filters, by column id. */
  filters: Partial<Record<string, DataTableFilter>>
  emptyMessage: ReactNode
}) {
  const { usersById } = context
  const preferences = useColumnPreferences("crons-jobs", cronJobColumnLayout)
  const [sorting, setSorting] = useSortQueryParam(
    CRON_SORT_KEYS,
    CRON_DEFAULT_SORT
  )
  const rows = useMemo(
    () => sortRows(jobs, sorting, cronJobSortValues(usersById)),
    [jobs, sorting, usersById]
  )
  const table = useDataTable({
    data: rows,
    columns: cronJobColumns,
    getRowId: (job) => job.id,
    sorting,
    onSortingChange: setSorting,
    ...columnPreferenceProps(preferences),
  })

  return (
    <DataTableView
      table={table}
      label="Crons"
      idPrefix="crons"
      onResetColumns={preferences.reset}
      rowState={(job) => ({ muted: isMutedJob(job) })}
      filters={filters}
      emptyMessage={emptyMessage}
      renderControl={(job, columnId) => {
        if (columnId === CRON_NAME_COLUMN) {
          return <CronJobIdentity job={job} handlerKeys={context.handlerKeys} />
        }
        if (columnId === CRON_RUNS_AS_COLUMN) {
          return <CronJobRunsAsCell job={job} usersById={usersById} />
        }
        if (columnId === CRON_ACTIONS_COLUMN) {
          return (
            <div className="flex items-center justify-end gap-1">
              <CronRowTrailingActions job={job} isAdmin={context.isAdmin} />
              {/* Same width as the menu trigger, kept when the viewer has
                  no action on this job, so the icons before it line up. */}
              <span className="flex w-10 shrink-0 justify-center md:w-9">
                <RowActions
                  actions={cronJobActions}
                  item={job}
                  context={context}
                  accessibleLabel={job.name}
                />
              </span>
            </div>
          )
        }
        return null
      }}
    />
  )
}
