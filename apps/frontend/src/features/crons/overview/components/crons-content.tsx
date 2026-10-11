import { getIcon } from "@/lib/icon-registry"

const Clock = getIcon("navigation", "crons")
const Plus = getIcon("actions", "add")

import { useMemo } from "react"
import { Text } from "@/components/shared/brand/typography"
import type { DataTableFilter } from "@/components/shared/data-display/data-table-column-filter"
import { HeroCount } from "@/components/shared/layout/page-hero"
import { ResourceOverview } from "@/components/shared/resource/resource-overview"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { CronFormDialog } from "@/features/crons/overview/components/cron-form-dialog"
import { CronJobsTable } from "@/features/crons/overview/components/cron-jobs-table"
import {
  CRON_NAME_COLUMN,
  type CronsRowContext,
} from "@/features/crons/overview/definitions/cron-job-columns.definition"
import { useCronHandlers } from "@/features/crons/overview/hooks/use-cron-handlers"
import { useCronJobEvents } from "@/features/crons/overview/hooks/use-cron-job-events"
import { useCronUsersByIds } from "@/features/crons/overview/hooks/use-cron-users-by-ids"
import {
  type CronFilters,
  cronFilterOptions,
  filterJobs,
} from "@/features/crons/overview/model/cron-filters"
import type { CronJob } from "@/features/crons/shared"
import { cronLabels, useCronJobs, useCronRemove } from "@/features/crons/shared"
import { useEditDialog } from "@/hooks/use-edit-dialog"
import {
  NO_VALUES,
  useQueryParam,
  valueListCodec,
} from "@/hooks/use-query-param"
import { useTargetConfirmDialog } from "@/hooks/use-target-confirm-dialog"
import { isAdminUser } from "@/lib/auth"
import { authClient } from "@/lib/auth-client"

export function CronsContent() {
  const { data: jobs = [], isPending, isError, refetch } = useCronJobs()
  const { data: handlers = [] } = useCronHandlers()
  useCronJobEvents()
  const removeCron = useCronRemove()
  const session = authClient.useSession()
  const isAdmin = !!isAdminUser(session.data?.user)

  const handlerKeys = useMemo(
    () => new Set(handlers.map((h) => h.key)),
    [handlers]
  )

  const editDialog = useEditDialog<CronJob>()

  const deleteDialog = useTargetConfirmDialog<CronJob>({
    title: cronLabels.deleteTitle,
    description: (job) => cronLabels.deleteDescription(job.name),
    confirmLabel: cronLabels.delete,
    onConfirm: (job) => removeCron.mutateAsync({ id: job.id }),
  })

  const [nameFilter, setNameFilter] = useQueryParam(
    "name",
    NO_VALUES,
    valueListCodec
  )
  const [tagFilter, setTagFilter] = useQueryParam(
    "tag",
    NO_VALUES,
    valueListCodec
  )
  const [statusFilter, setStatusFilter] = useQueryParam(
    "status",
    NO_VALUES,
    valueListCodec
  )

  const activeCount = jobs.filter((job) => job.enabled).length

  const runsAsUserIds = useMemo(
    () => jobs.flatMap((job) => (job.userId ? [job.userId] : [])),
    [jobs]
  )
  const usersById = useCronUsersByIds(runsAsUserIds)

  const filters: CronFilters = {
    name: nameFilter,
    tag: tagFilter,
    status: statusFilter,
  }
  const filteredJobs = useMemo(
    () =>
      filterJobs(jobs, {
        name: nameFilter,
        tag: tagFilter,
        status: statusFilter,
      }),
    [jobs, nameFilter, tagFilter, statusFilter]
  )
  const filterOptions = cronFilterOptions(jobs, filters)

  // An empty list is "every value": store the shared constant so the param
  // drops out of the URL.
  const valuesSetter =
    (set: (values: readonly string[]) => void) => (next: string[]) => {
      if (next.length === 0) {
        set(NO_VALUES)
        return
      }
      set(next)
    }

  const activeFilterCount =
    Number(nameFilter.length > 0) +
    Number(tagFilter.length > 0) +
    Number(statusFilter.length > 0)
  const clearFilters = () => {
    setNameFilter(NO_VALUES)
    setTagFilter(NO_VALUES)
    setStatusFilter(NO_VALUES)
  }

  const tableFilters: Partial<Record<string, DataTableFilter>> = {
    [CRON_NAME_COLUMN]: {
      options: filterOptions.name,
      selected: nameFilter,
      onChange: valuesSetter(setNameFilter),
    },
    tag: {
      options: filterOptions.tag,
      selected: tagFilter,
      onChange: valuesSetter(setTagFilter),
    },
    status: {
      options: filterOptions.status,
      selected: statusFilter,
      onChange: valuesSetter(setStatusFilter),
    },
  }

  const noMatches = (
    <div className="grid justify-items-center gap-2">
      <Text tone="muted">Ningún cron coincide con los filtros.</Text>
      {activeFilterCount > 0 ? (
        <Button variant="outline" size="sm" onClick={clearFilters}>
          Limpiar filtros
        </Button>
      ) : null}
    </div>
  )

  const rowContext: CronsRowContext = {
    isAdmin,
    handlerKeys,
    usersById,
    onEdit: editDialog.openEdit,
    onDelete: deleteDialog.open,
  }

  return (
    <>
      <ResourceOverview
        surface="crons"
        maxWidth="80%"
        description="Jobs programados del sistema."
        heroMeta={
          <HeroCount
            segments={[
              { count: activeCount, label: "activos" },
              { count: jobs.length, label: "total" },
            ]}
          />
        }
        heroAction={
          isAdmin ? (
            <Button onClick={editDialog.openCreate}>
              <Plus className="size-4" />
              {cronLabels.create}
            </Button>
          ) : null
        }
        query={{ data: jobs, isPending, isError, refetch }}
        loading="Cargando crons..."
        error={{
          icon: <Clock className="size-6" />,
          title: "No se pudieron cargar los crons",
          description:
            "Comprueba tu conexión y tus permisos; si el problema continúa, inténtalo de nuevo más tarde.",
        }}
        isEmpty={(data) => data.length === 0}
        empty={{
          icon: <Clock className="size-6" />,
          title: "No hay tareas programadas",
          description:
            "Crea una tarea para ejecutarla automáticamente según una expresión de tiempo.",
          action: isAdmin ? (
            <Button onClick={editDialog.openCreate}>{cronLabels.create}</Button>
          ) : undefined,
        }}
      >
        {() => (
          <div className="flex min-h-0 flex-1 flex-col">
            <CronJobsTable
              jobs={filteredJobs}
              context={rowContext}
              filters={tableFilters}
              emptyMessage={noMatches}
            />
          </div>
        )}
      </ResourceOverview>

      <CronFormDialog job={editDialog.editing} {...editDialog.dialogProps} />

      <ConfirmDialog {...deleteDialog.confirmDialogProps} />
    </>
  )
}
