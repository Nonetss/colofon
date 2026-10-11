import { skipToken, useInfiniteQuery, useQuery } from "@tanstack/react-query"
import type { CronRunStatus } from "@/features/crons/shared/model/types"
import { orpc } from "@/lib/orpc"

const CRON_RUNS_PAGE_SIZE = 30

export const useCronJobs = () => useQuery(orpc.v1.cron.list.queryOptions())

/** The job's read input, or `skipToken` (no request) until there is an id. */
function jobInput(id: string | null) {
  if (id === null) return skipToken
  return { id }
}

export const useCronJob = (id: string | null) =>
  useQuery(orpc.v1.cron.get.queryOptions({ input: jobInput(id) }))

export type CronRunSortKey = "startedAt" | "status" | "duration"

export interface CronRunsQuery {
  /** The statuses to keep; empty or omitted keeps every run. */
  statuses?: readonly CronRunStatus[]
  sort?: CronRunSortKey
  order?: "asc" | "desc"
}

function statusesInput(statuses: readonly CronRunStatus[] | undefined) {
  if (!statuses || statuses.length === 0) return undefined
  return [...statuses]
}

/** The run pages' input for a job, or `skipToken` until there is a job id. */
function runsInput(
  jobId: string | null,
  {
    statuses,
    sort,
    order,
  }: {
    statuses: readonly CronRunStatus[] | undefined
    sort: CronRunSortKey
    order: "asc" | "desc"
  }
) {
  if (jobId === null) return skipToken
  return (cursor: string | null) => ({
    jobId,
    statuses: statusesInput(statuses),
    sort,
    order,
    limit: CRON_RUNS_PAGE_SIZE,
    cursor,
  })
}

// The filter and the order are part of the input, so each combination gets
// its own query key and a fresh infinite list starting from page one.
export const useCronRuns = (
  jobId: string | null,
  { statuses, sort = "startedAt", order = "desc" }: CronRunsQuery = {}
) =>
  useInfiniteQuery(
    orpc.v1.cron.listRuns.infiniteOptions({
      input: runsInput(jobId, { statuses, sort, order }),
      initialPageParam: null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    })
  )
