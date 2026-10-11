import { getIcon } from "@/lib/icon-registry"

const Mail = getIcon("identity", "email")
const Trash2 = getIcon("actions", "delete")

import { Text } from "@/components/shared/brand/typography"
import { DataTableView } from "@/components/shared/data-display/data-table-view"
import { Hint } from "@/components/shared/feedback/hint"
import { SectionHeading } from "@/components/shared/layout/section-heading"
import { Button } from "@/components/ui/button"
import {
  invitationColumnLayout,
  invitationColumns,
  invitationSortValues,
} from "@/features/admin/organizations/definitions/organization-detail-columns.definition"
import type { OrganizationInvitation } from "@/features/admin/organizations/model/types"
import { useLocalDataTable } from "@/hooks/use-data-table"

/** The organization detail sheet's "Invitaciones pendientes" section:
 *  header + invite action, empty state, or the pending-invitation list. */
export function OrganizationInvitationsSection({
  invitations,
  isCanceling,
  onInviteClick,
  onCancelClick,
}: {
  invitations: OrganizationInvitation[]
  isCanceling: boolean
  onInviteClick: () => void
  onCancelClick: (invitationId: string) => void
}) {
  const { table, preferences } = useLocalDataTable({
    tableId: "admin-organization-invitations",
    rows: invitations,
    columns: invitationColumns,
    layout: invitationColumnLayout,
    getRowId: (invitation) => invitation.id,
    sortValues: invitationSortValues,
  })

  return (
    <section className="space-y-3">
      <SectionHeading
        title="Invitaciones pendientes"
        count={invitations.length}
        action={
          <Button size="sm" variant="outline" onClick={onInviteClick}>
            <Mail className="size-4" />
            Invitar
          </Button>
        }
      />

      {invitations.length === 0 ? (
        <Text as="p" tone="muted">
          No hay invitaciones pendientes.
        </Text>
      ) : (
        <DataTableView
          table={table}
          label="Invitaciones pendientes"
          idPrefix="admin-organization-invitations"
          layout="table"
          onResetColumns={preferences.reset}
          renderControl={(invitation) => (
            <Hint label="Cancelar invitación">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Cancelar la invitación a ${invitation.email}`}
                disabled={isCanceling}
                onClick={() => onCancelClick(invitation.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </Hint>
          )}
        />
      )}
    </section>
  )
}
