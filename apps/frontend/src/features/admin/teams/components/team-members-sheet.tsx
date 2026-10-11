import { getIcon } from "@/lib/icon-registry"

const Loader2 = getIcon("status", "loading")
const Trash2 = getIcon("actions", "delete")
const UserPlus = getIcon("identity", "addUser")

import { useState } from "react"
import { Text, textVariants } from "@/components/shared/brand/typography"
import { DataTableView } from "@/components/shared/data-display/data-table-view"
import { Hint } from "@/components/shared/feedback/hint"
import { StateCard } from "@/components/shared/feedback/state-card"
import { SectionHeading } from "@/components/shared/layout/section-heading"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useOrganizationDetail } from "@/features/admin/organizations/public"
import {
  teamMemberColumnLayout,
  teamMemberColumns,
  teamMemberSortValues,
} from "@/features/admin/teams/definitions/team-member-columns.definition"
import {
  useTeamMemberAdd,
  useTeamMemberRemove,
  useTeamMembersList,
} from "@/features/admin/teams/hooks/use-teams"
import type { Team } from "@/features/admin/teams/model/types"
import { useLocalDataTable } from "@/hooks/use-data-table"

interface TeamMembersSheetProps {
  team: Team | null
  onOpenChange: (open: boolean) => void
}

export function TeamMembersSheet({
  team,
  onOpenChange,
}: TeamMembersSheetProps) {
  const teamId = team?.id ?? null
  const { data: members = [], isPending } = useTeamMembersList(teamId)
  const { data: org } = useOrganizationDetail(team?.organizationId ?? null)
  const addTeamMember = useTeamMemberAdd(teamId ?? "")
  const removeTeamMember = useTeamMemberRemove(teamId ?? "")

  const [pickedUserId, setPickedUserId] = useState("")
  const { table, preferences } = useLocalDataTable({
    tableId: "admin-team-members",
    rows: members,
    columns: teamMemberColumns,
    layout: teamMemberColumnLayout,
    getRowId: (member) => member.userId,
    sortValues: teamMemberSortValues,
  })

  const memberUserIds = new Set(members.map((m) => m.userId))
  const candidates = (org?.members ?? []).filter(
    (m) => !memberUserIds.has(m.userId)
  )

  const handleAdd = async () => {
    if (!teamId || !pickedUserId) return
    await addTeamMember.mutateAsync({ teamId, userId: pickedUserId })
    setPickedUserId("")
  }

  return (
    <Sheet open={!!team} onOpenChange={(open) => !open && onOpenChange(false)}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className={textVariants({ role: "display" })}>
            {team?.name ?? "Equipo"}
          </SheetTitle>
          <SheetDescription className={textVariants({ role: "compact" })}>
            Miembros del equipo
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-6">
          <div className="flex items-center gap-2">
            <Select
              items={candidates.map((member) => ({
                value: member.userId,
                label: `${member.user.name} (${member.user.email})`,
              }))}
              value={pickedUserId}
              onValueChange={(value) => {
                if (value !== null) setPickedUserId(value)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Añadir miembro de la organización" />
              </SelectTrigger>
              <SelectContent>
                {candidates.length === 0 ? (
                  <Text as="div" tone="muted" className="px-2 py-1.5">
                    No hay miembros disponibles
                  </Text>
                ) : (
                  candidates.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {m.user.name} ({m.user.email})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Hint label="Añadir miembro">
              <Button
                type="button"
                size="icon"
                disabled={!pickedUserId || addTeamMember.isPending}
                onClick={handleAdd}
                aria-label="Añadir miembro"
              >
                {addTeamMember.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <UserPlus className="size-4" />
                )}
              </Button>
            </Hint>
          </div>

          {isPending ? (
            <StateCard spinner title="Cargando miembros..." />
          ) : members.length === 0 ? (
            <Text as="p" tone="muted">
              Este equipo no tiene miembros todavía.
            </Text>
          ) : (
            <div className="space-y-3">
              <SectionHeading title="Miembros" count={members.length} />
              <DataTableView
                table={table}
                label="Miembros"
                idPrefix="admin-team-members"
                layout="table"
                onResetColumns={preferences.reset}
                renderControl={(member) => (
                  <Hint label="Eliminar del equipo">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Eliminar a ${member.user.name} del equipo`}
                      disabled={removeTeamMember.isPending}
                      onClick={() =>
                        teamId &&
                        removeTeamMember.mutate({
                          teamId,
                          userId: member.userId,
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </Hint>
                )}
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
