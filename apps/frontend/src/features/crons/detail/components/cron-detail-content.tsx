import { getIcon } from "@/lib/icon-registry"

const Clock = getIcon("navigation", "crons")
const Loader2 = getIcon("status", "loading")
const Play = getIcon("actions", "run")
const Lock = getIcon("security", "locked")

import { useState } from "react"
import { StatusTag } from "@/components/shared/data-display/status-dot"
import { Hint } from "@/components/shared/feedback/hint"
import { StateCard } from "@/components/shared/feedback/state-card"
import { PageHero } from "@/components/shared/layout/page-hero"
import { Button } from "@/components/ui/button"
import { CronDetailMetadata } from "@/features/crons/detail/components/cron-detail-metadata"
import { CronRunPulse } from "@/features/crons/detail/components/cron-run-pulse"
import { CronRunTimeline } from "@/features/crons/detail/components/cron-run-timeline"
import {
  CRON_RUN_DEFAULT_SORT,
  CRON_RUN_SORT_KEYS,
  runStatusesOf,
} from "@/features/crons/detail/definitions/cron-run-columns.definition"
import { useCronRunEvents } from "@/features/crons/detail/hooks/use-cron-run-events"
import { useCronRunPulse } from "@/features/crons/detail/hooks/use-cron-run-pulse"
import {
  cronLabels,
  useCronJob,
  useCronRunNow,
  useCronRuns,
} from "@/features/crons/shared"
import { useAdminUser } from "@/hooks/use-admin-user"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import {
  NO_VALUES,
  useQueryParam,
  valueListCodec,
} from "@/hooks/use-query-param"
import { useSortQueryParam } from "@/hooks/use-sort-query-param"
import { isAdminUser } from "@/lib/auth"
import { authClient } from "@/lib/auth-client"

export function CronDetailContent({ jobId }: { jobId: string }) {
  const { data: job, isPending, isError, refetch } = useCronJob(jobId)
  const [statusParam, setStatusParam] = useQueryParam(
    "status",
    NO_VALUES,
    valueListCodec
  )
  // Unknown `?status=` values are dropped instead of emptying the list.
  const statuses = runStatusesOf(statusParam)
  const setStatuses = (next: string[]) => {
    if (next.length === 0) {
      setStatusParam(NO_VALUES)
      return
    }
    setStatusParam(next)
  }
  const [runSorting, setRunSorting, runOrdering] = useSortQueryParam(
    CRON_RUN_SORT_KEYS,
    CRON_RUN_DEFAULT_SORT
  )
  const {
    data: runsPages,
    isPending: runsPending,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useCronRuns(jobId, {
    statuses,
    sort: runOrdering.sort,
    order: runOrdering.order,
  })
  const { data: pulse } = useCronRunPulse(jobId)
  useCronRunEvents(jobId)
  const { data: runsAsUser } = useAdminUser(job?.userId ?? null)
  const runs = runsPages?.pages.flatMap((page) => page.runs) ?? []
  const session = authClient.useSession()
  const isAdmin = isAdminUser(session.data?.user)
  const runNow = useCronRunNow(jobId)
  // The history table scrolls in its own bounded box (its header stays on
  // top), so that box is the sentinel's root.
  const [runsBox, setRunsBox] = useState<HTMLDivElement | null>(null)
  const sentinelRef = useInfiniteScroll(
    runsBox,
    fetchNextPage,
    !!hasNextPage && !isFetchingNextPage
  )

  if (isError) {
    return (
      <StateCard
        icon={<Clock className="size-6" />}
        title="No se pudo cargar el cron"
        description="Comprueba tu conexión y tus permisos; si el problema continúa, inténtalo de nuevo más tarde."
        tone="destructive"
        action={
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        }
      />
    )
  }

  if (isPending || !job) {
    return <StateCard spinner title="Cargando cron..." />
  }

  const declaredInCode = job.source === "code"

  return (
    <div className="flex flex-col gap-8">
      <PageHero
        surface="cron-detail"
        title={job.name}
        description={job.description ?? job.handlerKey}
        status={
          <span className="flex items-center gap-3">
            <StatusTag dotTone={job.enabled ? "primary" : "border"}>
              {job.enabled ? "Activo" : "Deshabilitado"}
            </StatusTag>
            {declaredInCode ? (
              <Hint label={cronLabels.declaredInCode}>
                <span
                  role="img"
                  aria-label={cronLabels.declaredInCode}
                  className="flex text-muted-foreground"
                >
                  <Lock className="size-3.5" aria-hidden="true" />
                </span>
              </Hint>
            ) : null}
          </span>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && !declaredInCode ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={runNow.isPending}
                onClick={() => runNow.mutate()}
              >
                {runNow.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Play className="size-3.5" />
                )}
                {runNow.isPending
                  ? cronLabels.runNowPending
                  : cronLabels.runNow}
              </Button>
            ) : null}
          </div>
        }
      />

      <CronDetailMetadata job={job} runsAsUser={runsAsUser} />

      {pulse && pulse.runs.length > 0 ? (
        <CronRunPulse runs={pulse.runs} />
      ) : null}

      <CronRunTimeline
        runs={runs}
        statusFilter={statuses}
        onStatusFilterChange={setStatuses}
        onClearFilters={() => setStatusParam(NO_VALUES)}
        isPending={runsPending}
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        sentinelRef={sentinelRef}
        scrollRef={setRunsBox}
        sorting={runSorting}
        onSortingChange={setRunSorting}
      />
    </div>
  )
}
