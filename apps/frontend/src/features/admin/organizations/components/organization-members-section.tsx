import { getIcon } from "@/lib/icon-registry"

const Trash2 = getIcon("actions", "delete")
const UserPlus = getIcon("identity", "addUser")

import { Text } from "@/components/shared/brand/typography"
import { DataTableView } from "@/components/shared/data-display/data-table-view"
import { Hint } from "@/components/shared/feedback/hint"
import { SectionHeading } from "@/components/shared/layout/section-heading"
import { Button } from "@/components/ui/button"
import { RoleSelect } from "@/features/admin/organizations/components/role-select"
import {
  MEMBER_ROLE_COLUMN,
  memberColumnLayout,
  memberColumns,
  memberSortValues,
} from "@/features/admin/organizations/definitions/organization-detail-columns.definition"
import type {
  OrganizationCustomRole,
  OrganizationMember,
} from "@/features/admin/organizations/model/types"
import { useLocalDataTable } from "@/hooks/use-data-table"

/** The organization detail sheet's "Miembros" section: header + add action,
 *  empty state, or the member list with inline role editing and removal. */
export function OrganizationMembersSection({
  members,
  customRoles,
  onRoleChange,
  onAddClick,
  onRemoveClick,
}: {
  members: OrganizationMember[]
  customRoles: OrganizationCustomRole[]
  onRoleChange: (memberId: string, role: string) => void
  onAddClick: () => void
  onRemoveClick: (memberId: string) => void
}) {
  const { table, preferences } = useLocalDataTable({
    tableId: "admin-organization-members",
    rows: members,
    columns: memberColumns,
    layout: memberColumnLayout,
    getRowId: (member) => member.id,
    sortValues: memberSortValues,
  })

  return (
    <section className="space-y-3">
      <SectionHeading
        title="Miembros"
        count={members.length}
        action={
          <Button size="sm" onClick={onAddClick}>
            <UserPlus className="size-4" />
            Añadir
          </Button>
        }
      />

      {members.length === 0 ? (
        <Text as="p" tone="muted">
          Todavía no hay miembros.
        </Text>
      ) : (
        <DataTableView
          table={table}
          label="Miembros"
          idPrefix="admin-organization-members"
          layout="table"
          onResetColumns={preferences.reset}
          renderControl={(member, columnId) => {
            if (columnId === MEMBER_ROLE_COLUMN) {
              return (
                <RoleSelect
                  size="sm"
                  className="w-full"
                  value={member.role}
                  onValueChange={(role) => onRoleChange(member.id, role)}
                  customRoles={customRoles}
                />
              )
            }
            return (
              <Hint label="Eliminar miembro">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Eliminar a ${member.user.name}`}
                  onClick={() => onRemoveClick(member.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </Hint>
            )
          }}
        />
      )}
    </section>
  )
}
