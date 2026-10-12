import { useState } from "react"
import { textVariants } from "@/components/shared/brand/typography"
import { StateCard } from "@/components/shared/feedback/state-card"
import { ResizeHandle } from "@/components/shared/layout/resize-handle"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { AddMemberDialog } from "@/features/admin/organizations/components/add-member-dialog"
import { CreateRoleDialog } from "@/features/admin/organizations/components/create-role-dialog"
import { InviteMemberDialog } from "@/features/admin/organizations/components/invite-member-dialog"
import { OrganizationInvitationsSection } from "@/features/admin/organizations/components/organization-invitations-section"
import { OrganizationMembersSection } from "@/features/admin/organizations/components/organization-members-section"
import { OrganizationRolesSection } from "@/features/admin/organizations/components/organization-roles-section"
import { OrganizationTeamsSection } from "@/features/admin/organizations/components/organization-teams-section"
import {
  useInvitationCancel,
  useMemberRemove,
  useMemberRoleUpdate,
  useOrganizationDetail,
  useRoleRemove,
} from "@/features/admin/organizations/hooks/use-organization-detail"
import { useIsMobile } from "@/hooks/use-mobile"
import { useResizableWidth } from "@/hooks/use-resizable-width"
import { useTargetConfirmDialog } from "@/hooks/use-target-confirm-dialog"
import { cn } from "@/lib/utils"

const SHEET_MIN_REM = 20
const SHEET_MAX_VIEWPORT_RATIO = 0.9

/** A stored width, kept within bounds in CSS as the window changes size. */
function sheetWidthStyle(width: number | null, isMobile: boolean) {
  if (width === null || isMobile) return undefined
  return {
    width: `clamp(${SHEET_MIN_REM}rem, ${width}px, ${SHEET_MAX_VIEWPORT_RATIO * 100}vw)`,
  }
}

interface OrganizationDetailSheetProps {
  organizationId: string | null
  onOpenChange: (open: boolean) => void
}

export function OrganizationDetailSheet({
  organizationId,
  onOpenChange,
}: OrganizationDetailSheetProps) {
  const { data: org, isPending } = useOrganizationDetail(organizationId)
  const updateRole = useMemberRoleUpdate(organizationId ?? "")
  const removeMember = useMemberRemove(organizationId ?? "")
  const cancelInvitation = useInvitationCancel(organizationId ?? "")
  const removeRole = useRoleRemove(organizationId ?? "")

  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [createRoleOpen, setCreateRoleOpen] = useState(false)

  const removeMemberDialog = useTargetConfirmDialog<string>({
    title: "Eliminar miembro",
    description: () => "El usuario perderá acceso a esta organización.",
    confirmLabel: "Eliminar",
    onConfirm: (memberId) => removeMember.mutateAsync({ memberId }),
  })

  const removeRoleDialog = useTargetConfirmDialog<string>({
    title: "Eliminar rol",
    description: () =>
      "Los miembros que tengan este rol perderán sus permisos asociados.",
    confirmLabel: "Eliminar",
    onConfirm: (roleId) => removeRole.mutateAsync({ id: roleId }),
  })

  const isMobile = useIsMobile()
  const sheetWidth = useResizableWidth({
    storageKey: "organization-detail-sheet:width",
    minRem: SHEET_MIN_REM,
    maxViewportRatio: SHEET_MAX_VIEWPORT_RATIO,
  })

  const pendingInvitations =
    org?.invitations.filter((inv) => inv.status === "pending") ?? []

  return (
    <>
      <Sheet
        open={!!organizationId}
        onOpenChange={(open) => !open && onOpenChange(false)}
      >
        <SheetContent
          className={cn(
            "w-full gap-0 sm:max-w-lg",
            sheetWidth.width !== null && "sm:max-w-none",
            sheetWidth.isResizing && "transition-none select-none"
          )}
          style={sheetWidthStyle(sheetWidth.width, isMobile)}
        >
          {isMobile ? null : (
            <ResizeHandle
              label="Redimensionar panel"
              isResizing={sheetWidth.isResizing}
              getBounds={sheetWidth.getBounds}
              {...sheetWidth.handleProps}
            />
          )}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <SheetHeader>
              <SheetTitle className={textVariants({ role: "display" })}>
                {org?.name ?? "Organización"}
              </SheetTitle>
              <SheetDescription className={textVariants({ role: "compact" })}>
                {org ? `/${org.slug}` : "Cargando detalle..."}
              </SheetDescription>
            </SheetHeader>

            {isPending || !org ? (
              <div className="p-4">
                <StateCard spinner title="Cargando organización..." />
              </div>
            ) : (
              <div className="flex flex-col gap-6 px-4 pb-6">
                <OrganizationMembersSection
                  members={org.members}
                  customRoles={org.roles}
                  onRoleChange={(memberId, role) =>
                    updateRole.mutate({ memberId, role })
                  }
                  onAddClick={() => setAddMemberOpen(true)}
                  onRemoveClick={(memberId) =>
                    removeMemberDialog.open(memberId)
                  }
                />

                <OrganizationInvitationsSection
                  invitations={pendingInvitations}
                  isCanceling={cancelInvitation.isPending}
                  onInviteClick={() => setInviteOpen(true)}
                  onCancelClick={(id) => cancelInvitation.mutate({ id })}
                />

                <OrganizationTeamsSection teams={org.teams} />

                <OrganizationRolesSection
                  roles={org.roles}
                  onCreateClick={() => setCreateRoleOpen(true)}
                  onRemoveClick={(roleId) => removeRoleDialog.open(roleId)}
                />
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {organizationId ? (
        <>
          <AddMemberDialog
            organizationId={organizationId}
            existingUserIds={org?.members.map((m) => m.userId) ?? []}
            customRoles={org?.roles ?? []}
            open={addMemberOpen}
            onOpenChange={setAddMemberOpen}
          />
          <InviteMemberDialog
            organizationId={organizationId}
            customRoles={org?.roles ?? []}
            open={inviteOpen}
            onOpenChange={setInviteOpen}
          />
          <CreateRoleDialog
            organizationId={organizationId}
            open={createRoleOpen}
            onOpenChange={setCreateRoleOpen}
          />
        </>
      ) : null}

      <ConfirmDialog {...removeMemberDialog.confirmDialogProps} />

      <ConfirmDialog {...removeRoleDialog.confirmDialogProps} />
    </>
  )
}
