import { useMemo } from "react"
import { Text } from "@/components/shared/brand/typography"
import { DataTableIdentityCell } from "@/components/shared/data-display/data-table-cell-content"
import { DataTableView } from "@/components/shared/data-display/data-table-view"
import { RowActions } from "@/components/shared/data-display/row-action-items"
import { HeroCount } from "@/components/shared/layout/page-hero"
import { ResourceOverview } from "@/components/shared/resource/resource-overview"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { OrganizationDetailSheet } from "@/features/profile/organizations/components/organization-detail-sheet"
import { OrganizationFormDialog } from "@/features/profile/organizations/components/organization-form-dialog"
import { ReceivedInvitations } from "@/features/profile/organizations/components/received-invitations"
import {
  type MyOrganizationsRowContext,
  ORGANIZATION_DEFAULT_SORT,
  ORGANIZATION_NAME_COLUMN,
  ORGANIZATION_SORT_KEYS,
  organizationActions,
  organizationColumnLayout,
  organizationColumns,
  organizationSortValues,
} from "@/features/profile/organizations/definitions/organization-columns.definition"
import {
  useMyOrganizations,
  useOrganizationDelete,
  useOrganizationLeave,
} from "@/features/profile/organizations/hooks/use-my-organizations"
import type { MyOrganization } from "@/features/profile/organizations/model/types"
import { useColumnPreferences } from "@/hooks/use-column-preferences"
import { columnPreferenceProps, useDataTable } from "@/hooks/use-data-table"
import { useEditDialog } from "@/hooks/use-edit-dialog"
import { useSortQueryParam } from "@/hooks/use-sort-query-param"
import { useTargetConfirmDialog } from "@/hooks/use-target-confirm-dialog"
import { useTargetDialog } from "@/hooks/use-target-dialog"
import { getIcon } from "@/lib/icon-registry"
import { sortRows } from "@/lib/sort-rows"

const Building2 = getIcon("entities", "organization")
const Plus = getIcon("actions", "add")

const NO_ORGANIZATIONS: MyOrganization[] = []

function countLabel(count: number): string {
  if (count === 1) return "organización"
  return "organizaciones"
}

export function ProfileOrganizationsContent() {
  const list = useMyOrganizations()
  const deleteOrganization = useOrganizationDelete()
  const leaveOrganization = useOrganizationLeave()

  const editDialog = useEditDialog<MyOrganization>()
  const detailDialog = useTargetDialog<string>()
  const deleteDialog = useTargetConfirmDialog<MyOrganization>({
    title: "Eliminar organización",
    description: (organization) =>
      `Se elimina "${organization.name}" con sus miembros e invitaciones, y sus miembros dejan de leer los repositorios compartidos con ella. No se puede deshacer.`,
    confirmLabel: "Eliminar",
    onConfirm: (organization) =>
      deleteOrganization.mutateAsync({ id: organization.id }),
  })
  const leaveDialog = useTargetConfirmDialog<MyOrganization>({
    title: "Salir de la organización",
    description: (organization) =>
      `Dejarás de leer los repositorios compartidos con "${organization.name}", y los tuyos dejarán de estar compartidos con ella.`,
    confirmLabel: "Salir",
    onConfirm: (organization) =>
      leaveOrganization.mutateAsync({ id: organization.id }),
  })

  const organizations = list.data ?? NO_ORGANIZATIONS
  const rowContext: MyOrganizationsRowContext = {
    onOpen: (organization) => detailDialog.open(organization.id),
    onEdit: editDialog.openEdit,
    onDelete: deleteDialog.open,
    onLeave: leaveDialog.open,
  }
  const preferences = useColumnPreferences(
    "profile-organizations",
    organizationColumnLayout
  )
  const [sorting, setSorting] = useSortQueryParam(
    ORGANIZATION_SORT_KEYS,
    ORGANIZATION_DEFAULT_SORT
  )
  const rows = useMemo(
    () => sortRows(organizations, sorting, organizationSortValues),
    [organizations, sorting]
  )
  const table = useDataTable({
    data: rows,
    columns: organizationColumns,
    getRowId: (organization) => organization.id,
    sorting,
    onSortingChange: setSorting,
    ...columnPreferenceProps(preferences),
  })

  return (
    <>
      <ResourceOverview
        maxWidth="full"
        padding="none"
        surface="profile-organizations"
        heroMeta={
          <HeroCount
            segments={[
              {
                count: organizations.length,
                label: countLabel(organizations.length),
              },
            ]}
          />
        }
        heroAction={
          <Button onClick={editDialog.openCreate}>
            <Plus className="size-4" />
            Nueva organización
          </Button>
        }
        heroChildren={
          <div className="space-y-6">
            <Text
              as="p"
              variant="compact"
              tone="muted"
              className="border-y py-3 leading-relaxed"
            >
              Los miembros de una organización leen los repositorios que sus
              miembros comparten con ella, desde la página de cada repositorio.
              Los propietarios y administradores invitan a otras personas, que
              aceptan la invitación aquí.
            </Text>
            <ReceivedInvitations />
          </div>
        }
        query={{
          data: list.data,
          isPending: list.isPending,
          isError: list.isError,
          refetch: list.refetch,
        }}
        loading="Cargando organizaciones..."
        error={{
          icon: <Building2 className="size-6" />,
          title: "No se pudieron cargar tus organizaciones",
          description:
            "Comprueba tu conexión; si el problema continúa, inténtalo de nuevo más tarde.",
        }}
        isEmpty={(data) => data.length === 0}
        empty={{
          icon: <Building2 className="size-6" />,
          title: "Aún no perteneces a ninguna",
          description:
            "Crea una organización e invita a otras personas para compartir con ellas tus repositorios.",
          action: (
            <Button onClick={editDialog.openCreate}>Nueva organización</Button>
          ),
        }}
      >
        {() => (
          <DataTableView
            table={table}
            label="Tus organizaciones"
            idPrefix="profile-organizations"
            onResetColumns={preferences.reset}
            renderControl={(organization, columnId) => {
              if (columnId === ORGANIZATION_NAME_COLUMN) {
                return (
                  <DataTableIdentityCell
                    primary={organization.name}
                    secondary={`/${organization.slug}`}
                    onOpen={() => detailDialog.open(organization.id)}
                    label={organization.name}
                  />
                )
              }
              return (
                <RowActions
                  actions={organizationActions}
                  item={organization}
                  context={rowContext}
                  accessibleLabel={organization.name}
                />
              )
            }}
          />
        )}
      </ResourceOverview>

      <OrganizationFormDialog
        organization={editDialog.editing}
        {...editDialog.dialogProps}
      />

      <OrganizationDetailSheet
        organizationId={detailDialog.target}
        onOpenChange={detailDialog.dialogProps.onOpenChange}
      />

      <ConfirmDialog {...deleteDialog.confirmDialogProps} />
      <ConfirmDialog {...leaveDialog.confirmDialogProps} />
    </>
  )
}
