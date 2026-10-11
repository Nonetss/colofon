import { getIcon } from "@/lib/icon-registry"

const UserRound = getIcon("identity", "user")

import { createColumnHelper } from "@tanstack/react-table"
import { Text } from "@/components/shared/brand/typography"
import {
  DataTableIdentityCell,
  type DataTableStatus,
  DataTableStatusCell,
} from "@/components/shared/data-display/data-table-cell-content"
import type { RowActionDescriptor } from "@/components/shared/data-display/row-action-items"
import { Hint } from "@/components/shared/feedback/hint"
import { Button } from "@/components/ui/button"
import { jobTag } from "@/features/crons/overview/model/group-by-tag"
import type { CronJob } from "@/features/crons/shared"
import { cronLabels, useCronSetEnabled } from "@/features/crons/shared"
import { columnLayoutOf, type DataTableFeatures } from "@/hooks/use-data-table"
import type { SortOrdering } from "@/hooks/use-sort-query-param"
import { formatDateTime } from "@/lib/format"
import { iconRef } from "@/lib/icon-registry"
import type { SortValue } from "@/lib/sort-rows"

const PlayIcon = getIcon("actions", "run")
const PauseIcon = getIcon("actions", "pause")
const LockIcon = getIcon("security", "locked")

export interface CronsRowContext {
  isAdmin: boolean
  handlerKeys: Set<string>
  usersById: Map<string, { name?: string | null }>
  onEdit: (job: CronJob) => void
  onDelete: (job: CronJob) => void
}

export const isDeclaredInCode = (job: CronJob) => job.source === "code"

function runsAsName(
  user: { name?: string | null } | undefined,
  userId: string
): string {
  if (user?.name) return user.name
  return userId
}

export function CronRowRunsAs({
  userId,
  user,
}: {
  userId: string | null
  user: { name?: string | null } | undefined
}) {
  if (!userId) {
    return (
      <span className="text-muted-foreground/70 italic">
        {cronLabels.runsAsNobody}
      </span>
    )
  }
  return <span className="truncate">{runsAsName(user, userId)}</span>
}

function CronRowEnabledToggle({ job }: { job: CronJob }) {
  const setEnabled = useCronSetEnabled(job.id)
  const Icon = job.enabled ? PauseIcon : PlayIcon
  return (
    <Hint label={job.enabled ? "Pausar" : "Reanudar"}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground"
        disabled={setEnabled.isPending}
        aria-label={job.enabled ? `Pausar ${job.name}` : `Reanudar ${job.name}`}
        aria-pressed={job.enabled}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setEnabled.mutate({ id: job.id, enabled: !job.enabled })
        }}
      >
        <Icon aria-hidden="true" />
      </Button>
    </Hint>
  )
}

/** Sits in the pause/resume slot so code-declared rows keep their alignment. */
function CronRowLockedMarker() {
  return (
    <Hint label={cronLabels.declaredInCode}>
      <span
        role="img"
        aria-label={cronLabels.declaredInCode}
        className="flex size-8 items-center justify-center text-muted-foreground"
      >
        <LockIcon className="size-3.5" aria-hidden="true" />
      </span>
    </Hint>
  )
}

/** The pause/resume toggle for admins, or the lock of a code-declared job. */
function CronRowStateControl({
  job,
  isAdmin,
}: {
  job: CronJob
  isAdmin: boolean
}) {
  if (isDeclaredInCode(job)) return <CronRowLockedMarker />
  if (isAdmin) return <CronRowEnabledToggle job={job} />
  return null
}

/** The trailing state slot of a cron row: the pause toggle or the lock. */
export function CronRowTrailingActions({
  job,
  isAdmin,
}: {
  job: CronJob
  isAdmin: boolean
}) {
  return (
    <div className="flex items-center gap-1">
      {/* A fixed slot, so rows line up whether or not they have a pause
          toggle or a lock. */}
      <span className="flex size-8 shrink-0 items-center justify-center">
        <CronRowStateControl job={job} isAdmin={isAdmin} />
      </span>
    </div>
  )
}

/** Columns the row renders, as they read the page's handler catalogue, the
 *  runs-as users, the viewer's role or its dialogs. */
export const CRON_NAME_COLUMN = "name"
export const CRON_RUNS_AS_COLUMN = "runsAs"
export const CRON_ACTIONS_COLUMN = "actions"

export const CRON_SORT_KEYS = [
  "name",
  "tag",
  "status",
  "expression",
  "runsAs",
  "lastRunAt",
  "nextRunAt",
] as const

export type CronSortKey = (typeof CRON_SORT_KEYS)[number]

/** `cron.list`'s own order. */
export const CRON_DEFAULT_SORT: SortOrdering<CronSortKey> = {
  sort: "name",
  order: "asc",
}

function cronStatus(job: CronJob): DataTableStatus {
  if (job.enabled) return { tone: "primary", label: "Activo" }
  return { tone: "border", label: "Pausa" }
}

function timeOf(value: string | null): number | null {
  if (!value) return null
  return new Date(value).getTime()
}

/** Code-declared jobs read as dimmed, background machinery. */
export function isMutedJob(job: CronJob): boolean {
  return !job.enabled || isDeclaredInCode(job)
}

function HandlerKey({ job, available }: { job: CronJob; available: boolean }) {
  if (isDeclaredInCode(job) || available) {
    return (
      <Text as="span" variant="data" className="text-sm">
        {job.handlerKey}
      </Text>
    )
  }
  return (
    <span className="text-destructive">{cronLabels.handlerUnavailable}</span>
  )
}

/** The job's name over its handler key (or the unavailable-handler warning),
 *  linking to its detail page. */
export function CronJobIdentity({
  job,
  handlerKeys,
}: {
  job: CronJob
  handlerKeys: Set<string>
}) {
  return (
    <DataTableIdentityCell
      primary={job.name}
      secondary={
        <HandlerKey job={job} available={handlerKeys.has(job.handlerKey)} />
      }
      href={`/crons/${job.id}`}
      label={job.name}
    />
  )
}

export function CronJobRunsAsCell({
  job,
  usersById,
}: {
  job: CronJob
  usersById: Map<string, { name?: string | null }>
}) {
  const user = job.userId ? usersById.get(job.userId) : undefined
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <UserRound className="size-3 shrink-0 text-muted-foreground/70" />
      <CronRowRunsAs userId={job.userId} user={user} />
    </span>
  )
}

const helper = createColumnHelper<DataTableFeatures, CronJob>()

export const cronJobColumns = helper.columns([
  helper.accessor((job) => job.name, {
    id: CRON_NAME_COLUMN,
    header: "Nombre",
    size: 260,
    minSize: 160,
    enableSorting: true,
    meta: {
      label: "Nombre",
      reorderable: false,
      compact: "primary",
      rowRendered: true,
    },
  }),
  helper.accessor(jobTag, {
    id: "tag",
    header: "Etiqueta",
    size: 160,
    enableSorting: true,
    meta: { label: "Etiqueta", reorderable: true },
    cell: (info) => (
      <Text tone="muted" className="block truncate">
        {info.getValue()}
      </Text>
    ),
  }),
  helper.accessor((job) => job.enabled, {
    id: "status",
    header: "Estado",
    size: 120,
    enableSorting: true,
    meta: { label: "Estado", reorderable: true, compact: "status" },
    cell: (info) => (
      <DataTableStatusCell status={cronStatus(info.row.original)} />
    ),
  }),
  helper.accessor((job) => job.cronExpression, {
    id: "expression",
    header: "Expresión",
    size: 150,
    enableSorting: true,
    meta: { label: "Expresión", reorderable: true },
    cell: (info) => (
      <Text as="code" variant="data">
        {info.getValue()}
      </Text>
    ),
  }),
  helper.accessor((job) => job.userId, {
    id: CRON_RUNS_AS_COLUMN,
    header: cronLabels.runsAs,
    size: 180,
    enableSorting: true,
    meta: { label: cronLabels.runsAs, reorderable: true, rowRendered: true },
  }),
  helper.accessor((job) => job.lastRunAt, {
    id: "lastRunAt",
    header: "Última",
    size: 150,
    enableSorting: true,
    meta: { label: "Última", reorderable: true },
    cell: (info) => (
      <Text tone="muted" className="tabular-nums">
        {formatDateTime(info.row.original.lastRunAt)}
      </Text>
    ),
  }),
  helper.accessor((job) => job.nextRunAt, {
    id: "nextRunAt",
    header: "Próxima",
    size: 150,
    enableSorting: true,
    meta: { label: "Próxima", reorderable: true },
    cell: (info) => (
      <span className="tabular-nums">
        {formatDateTime(info.row.original.nextRunAt)}
      </span>
    ),
  }),
  helper.display({
    id: CRON_ACTIONS_COLUMN,
    header: "Acciones",
    size: 180,
    minSize: 150,
    meta: {
      label: "Acciones",
      reorderable: false,
      cellClassName: "text-right",
      headerClassName: "text-right",
    },
  }),
])

export const cronJobColumnLayout = columnLayoutOf(cronJobColumns)

/** Sort values for the job tables; "runs as" sorts by the user's name. */
export function cronJobSortValues(
  usersById: Map<string, { name?: string | null }>
): Partial<Record<CronSortKey, SortValue<CronJob>>> {
  return {
    name: (job) => job.name,
    tag: jobTag,
    status: (job) => Number(job.enabled),
    expression: (job) => job.cronExpression,
    runsAs: (job) => {
      if (!job.userId) return null
      return runsAsName(usersById.get(job.userId), job.userId)
    },
    lastRunAt: (job) => timeOf(job.lastRunAt),
    nextRunAt: (job) => timeOf(job.nextRunAt),
  }
}

/** Edit and delete, for administrators and only on manual jobs. */
export const cronJobActions: RowActionDescriptor<CronJob, CronsRowContext>[] = [
  {
    key: "edit",
    label: cronLabels.edit,
    icon: iconRef("actions", "edit"),
    hidden: (job, ctx) => !ctx.isAdmin || isDeclaredInCode(job),
    onSelect: (job, ctx) => ctx.onEdit(job),
  },
  {
    key: "delete",
    label: cronLabels.delete,
    icon: iconRef("actions", "delete"),
    destructive: true,
    hidden: (job, ctx) => !ctx.isAdmin || isDeclaredInCode(job),
    onSelect: (job, ctx) => ctx.onDelete(job),
  },
]
