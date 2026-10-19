import { useState } from "react"
import { Text, textVariants } from "@/components/shared/brand/typography"
import { DataTableView } from "@/components/shared/data-display/data-table-view"
import { Hint } from "@/components/shared/feedback/hint"
import { StateCard } from "@/components/shared/feedback/state-card"
import { SectionHeading } from "@/components/shared/layout/section-heading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { AddMemberDialog } from "@/features/profile/organizations/components/add-member-dialog"
import { InviteDialog } from "@/features/profile/organizations/components/invite-dialog"
import { RoleSelect } from "@/features/profile/organizations/components/role-select"
import {
  invitationColumnLayout,
  invitationColumns,
  invitationSortValues,
  MEMBER_ROLE_COLUMN,
  memberColumnLayout,
  memberColumns,
  memberSortValues,
} from "@/features/profile/organizations/definitions/organization-detail-columns.definition"
import { ROLE_LABELS } from "@/features/profile/organizations/definitions/role-options"
import {
  useInvitationCancel,
  useMemberRemove,
  useMemberRoleUpdate,
  useMyOrganization,
} from "@/features/profile/organizations/hooks/use-my-organizations"
import {
  assignableRoles,
  canEditMember,
  canManageMembers,
} from "@/features/profile/organizations/model/permissions"
import type {
  MyOrganizationDetail,
  OrganizationInvitation,
  OrganizationMember,
} from "@/features/profile/organizations/model/types"
import { useLocalDataTable } from "@/hooks/use-data-table"
import { useTargetConfirmDialog } from "@/hooks/use-target-confirm-dialog"
import { getIcon } from "@/lib/icon-registry"

const Trash2 = getIcon("actions", "delete")
const UserPlus = getIcon("identity", "addUser")

function MembersSection({
  organization,
  onAdd,
  onRemove,
}: {
  organization: MyOrganizationDetail
  onAdd: () => void
  onRemove: (member: OrganizationMember) => void
}) {
  const updateRole = useMemberRoleUpdate()
  const { table, preferences } = useLocalDataTable({
    tableId: "profile-organization-members",
    rows: organization.members,
    columns: memberColumns,
    layout: memberColumnLayout,
    getRowId: (member) => member.id,
    sortValues: memberSortValues,
  })
  const own = organization.role

  return (
    <section className="space-y-3">
      <SectionHeading
        title="Miembros"
        count={organization.members.length}
        action={
          organization.canAddMembers && (
            <Button size="sm" variant="outline" onClick={onAdd}>
              <UserPlus className="size-4" />
              Añadir miembro
            </Button>
          )
        }
      />
      <DataTableView
        table={table}
        label="Miembros"
        idPrefix="profile-organization-members"
        layout="table"
        onResetColumns={preferences.reset}
        renderControl={(member, columnId) => {
          const editable = canEditMember(own, member.role)
          if (columnId === MEMBER_ROLE_COLUMN) {
            if (!editable) {
              return (
                <span className="flex items-center gap-2">
                  <Text>{ROLE_LABELS[member.role]}</Text>
                  {member.isCaller && <Badge variant="secondary">Tú</Badge>}
                </span>
              )
            }
            return (
              <RoleSelect
                size="sm"
                className="w-full"
                aria-label={`Rol de ${member.name}`}
                value={member.role}
                roles={assignableRoles(own)}
                disabled={updateRole.isPending}
                onValueChange={(role) =>
                  updateRole.mutate({ memberId: member.id, role })
                }
              />
            )
          }
          if (!editable || member.isCaller) return null
          return (
            <Hint label="Quitar de la organización">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Quitar a ${member.name}`}
                onClick={() => onRemove(member)}
              >
                <Trash2 className="size-4" />
              </Button>
            </Hint>
          )
        }}
      />
    </section>
  )
}

function InvitationsSection({
  organization,
  onInvite,
}: {
  organization: MyOrganizationDetail
  onInvite: () => void
}) {
  const cancel = useInvitationCancel()
  const { table, preferences } = useLocalDataTable({
    tableId: "profile-organization-invitations",
    rows: organization.invitations,
    columns: invitationColumns,
    layout: invitationColumnLayout,
    getRowId: (invitation) => invitation.id,
    sortValues: invitationSortValues,
  })

  return (
    <section className="space-y-3">
      <SectionHeading
        title="Invitaciones pendientes"
        count={organization.invitations.length}
        action={
          <Button size="sm" onClick={onInvite}>
            <UserPlus className="size-4" />
            Invitar
          </Button>
        }
      />
      {organization.invitations.length === 0 ? (
        <Text as="p" tone="muted">
          No hay invitaciones pendientes.
        </Text>
      ) : (
        <DataTableView
          table={table}
          label="Invitaciones pendientes"
          idPrefix="profile-organization-invitations"
          layout="table"
          onResetColumns={preferences.reset}
          renderControl={(invitation: OrganizationInvitation) => (
            <Hint label="Cancelar invitación">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Cancelar la invitación a ${invitation.email}`}
                disabled={cancel.isPending}
                onClick={() => cancel.mutate({ id: invitation.id })}
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

interface OrganizationDetailSheetProps {
  organizationId: string | null
  onOpenChange: (open: boolean) => void
}

/** An organization's members and, for its owners and admins, invitations. */
export function OrganizationDetailSheet({
  organizationId,
  onOpenChange,
}: OrganizationDetailSheetProps) {
  const detail = useMyOrganization(organizationId)
  const removeMember = useMemberRemove()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const removeDialog = useTargetConfirmDialog<OrganizationMember>({
    title: "Quitar de la organización",
    description: (member) =>
      `${member.name} dejará de leer los repositorios compartidos con la organización, y los suyos dejarán de estar compartidos con ella.`,
    confirmLabel: "Quitar",
    onConfirm: (member) => removeMember.mutateAsync({ memberId: member.id }),
  })

  const organization = detail.data

  return (
    <>
      <Sheet
        open={organizationId !== null}
        onOpenChange={(open) => {
          if (!open) onOpenChange(false)
        }}
      >
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className={textVariants({ role: "display" })}>
              {organization?.name ?? "Organización"}
            </SheetTitle>
            <SheetDescription className={textVariants({ role: "compact" })}>
              {organization === undefined
                ? "Cargando..."
                : `/${organization.slug} · ${ROLE_LABELS[organization.role]}`}
            </SheetDescription>
          </SheetHeader>
          {organization === undefined ? (
            <div className="p-4">
              <StateCard
                spinner={detail.isPending}
                title={
                  detail.isError
                    ? "No se pudo cargar la organización"
                    : "Cargando organización..."
                }
              />
            </div>
          ) : (
            <div className="flex flex-col gap-6 px-4 pb-6">
              <MembersSection
                organization={organization}
                onAdd={() => setAddOpen(true)}
                onRemove={removeDialog.open}
              />
              {canManageMembers(organization.role) && (
                <InvitationsSection
                  organization={organization}
                  onInvite={() => setInviteOpen(true)}
                />
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {organization !== undefined && (
        <>
          <InviteDialog
            organization={organization}
            open={inviteOpen}
            onOpenChange={setInviteOpen}
          />
          <AddMemberDialog
            organization={organization}
            open={addOpen}
            onOpenChange={setAddOpen}
          />
        </>
      )}
      <ConfirmDialog {...removeDialog.confirmDialogProps} />
    </>
  )
}
