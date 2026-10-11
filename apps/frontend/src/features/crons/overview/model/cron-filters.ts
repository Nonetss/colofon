import type { DataTableFilterOption } from "@/components/shared/data-display/data-table-column-filter"
import {
  availableTags,
  jobTag,
} from "@/features/crons/overview/model/group-by-tag"
import type { CronJob } from "@/features/crons/shared"

/** The `/crons` column filters: the values each column keeps, empty meaning
 *  every value. */
export interface CronFilters {
  name: readonly string[]
  tag: readonly string[]
  status: readonly string[]
}

export type CronFilterColumn = keyof CronFilters

function statusOf(job: CronJob): string {
  if (job.enabled) return "enabled"
  return "disabled"
}

const cellValue: Record<CronFilterColumn, (job: CronJob) => string> = {
  name: (job) => job.name,
  tag: jobTag,
  status: statusOf,
}

function keeps(values: readonly string[], value: string): boolean {
  return values.length === 0 || values.includes(value)
}

/** The jobs every filter keeps, leaving out `except` (to count a column's
 *  values under the other filters). */
export function filterJobs(
  jobs: readonly CronJob[],
  filters: CronFilters,
  except?: CronFilterColumn
): CronJob[] {
  const columns: CronFilterColumn[] = ["name", "tag", "status"]
  return jobs.filter((job) =>
    columns.every(
      (column) =>
        column === except || keeps(filters[column], cellValue[column](job))
    )
  )
}

function countsOf(jobs: readonly CronJob[], column: CronFilterColumn) {
  const counts = new Map<string, number>()
  for (const job of jobs) {
    const value = cellValue[column](job)
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return counts
}

/** Each filterable column's values, with how many jobs the other filters
 *  leave for each one. */
export function cronFilterOptions(
  jobs: readonly CronJob[],
  filters: CronFilters
): Record<CronFilterColumn, DataTableFilterOption[]> {
  const nameCounts = countsOf(filterJobs(jobs, filters, "name"), "name")
  const tagCounts = countsOf(filterJobs(jobs, filters, "tag"), "tag")
  const statusCounts = countsOf(filterJobs(jobs, filters, "status"), "status")
  return {
    name: [...jobs]
      .sort((a, b) => a.name.localeCompare(b.name, "es"))
      .map((job) => ({
        value: job.name,
        label: job.name,
        detail: job.handlerKey,
        count: nameCounts.get(job.name) ?? 0,
      })),
    tag: availableTags([...jobs]).map((tag) => ({
      value: tag,
      label: tag,
      count: tagCounts.get(tag) ?? 0,
    })),
    status: [
      {
        value: "enabled",
        label: "Activo",
        count: statusCounts.get("enabled") ?? 0,
      },
      {
        value: "disabled",
        label: "Pausa",
        count: statusCounts.get("disabled") ?? 0,
      },
    ],
  }
}
