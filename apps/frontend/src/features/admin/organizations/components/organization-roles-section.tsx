import { getIcon } from "@/lib/icon-registry"

const ShieldPlus = getIcon("security", "grant")
const Trash2 = getIcon("actions", "delete")

import { Text } from "@/components/shared/brand/typography"
import { DataTableView } from "@/components/shared/data-display/data-table-view"
import { Hint } from "@/components/shared/feedback/hint"
import { SectionHeading } from "@/components/shared/layout/section-heading"
import { Button } from "@/components/ui/button"
import {
  roleColumnLayout,
  roleColumns,
  roleSortValues,
} from "@/features/admin/organizations/definitions/organization-detail-columns.definition"
import type { OrganizationCustomRole } from "@/features/admin/organizations/model/types"
import { useLocalDataTable } from "@/hooks/use-data-table"

/** The organization detail sheet's "Roles personalizados" section: header +
 *  create action, empty state, or the custom-role list with removal. */
export function OrganizationRolesSection({
  roles,
  onCreateClick,
  onRemoveClick,
}: {
  roles: OrganizationCustomRole[]
  onCreateClick: () => void
  onRemoveClick: (roleId: string) => void
}) {
  const { table, preferences } = useLocalDataTable({
    tableId: "admin-organization-roles",
    rows: roles,
    columns: roleColumns,
    layout: roleColumnLayout,
    getRowId: (role) => role.id,
    sortValues: roleSortValues,
  })

  return (
    <section className="space-y-3">
      <SectionHeading
        title="Roles personalizados"
        count={roles.length}
        action={
          <Button size="sm" variant="outline" onClick={onCreateClick}>
            <ShieldPlus className="size-4" />
            Nuevo rol
          </Button>
        }
      />

      {roles.length === 0 ? (
        <Text as="p" tone="muted">
          Esta organización no tiene roles personalizados. Usa Propietario,
          Administrador o Miembro, o crea uno nuevo.
        </Text>
      ) : (
        <DataTableView
          table={table}
          label="Roles personalizados"
          idPrefix="admin-organization-roles"
          layout="table"
          onResetColumns={preferences.reset}
          renderControl={(role) => (
            <Hint label="Eliminar rol">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Eliminar el rol ${role.role}`}
                onClick={() => onRemoveClick(role.id)}
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
