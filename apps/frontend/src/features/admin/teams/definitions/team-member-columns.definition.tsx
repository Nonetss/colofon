import { createColumnHelper } from "@tanstack/react-table"
import { DataTableIdentityCell } from "@/components/shared/data-display/data-table-cell-content"
import { UserAvatar } from "@/components/shared/user/avatar"
import type { TeamMember } from "@/features/admin/teams/model/types"
import { columnLayoutOf, type DataTableFeatures } from "@/hooks/use-data-table"
import type { SortValue } from "@/lib/sort-rows"

/** The team members sheet's table: the member and a remove control, sorted
 *  locally and shown as a table at every width. */
const helper = createColumnHelper<DataTableFeatures, TeamMember>()

export const teamMemberColumns = helper.columns([
  helper.accessor((member) => member.user.name, {
    id: "member",
    header: "Miembro",
    size: 280,
    minSize: 160,
    enableSorting: true,
    meta: { label: "Miembro", reorderable: false },
    cell: (info) => (
      <DataTableIdentityCell
        primary={info.row.original.user.name}
        secondary={info.row.original.user.email}
        leading={
          <UserAvatar
            displayName={info.row.original.user.name}
            email={info.row.original.user.email}
            imageUrl={info.row.original.user.image}
            size="sm"
          />
        }
      />
    ),
  }),
  helper.display({
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    size: 56,
    enableResizing: false,
    meta: {
      label: "Acciones",
      reorderable: false,
      cellClassName: "text-right",
    },
  }),
])

export const teamMemberColumnLayout = columnLayoutOf(teamMemberColumns)

export const teamMemberSortValues: Partial<
  Record<string, SortValue<TeamMember>>
> = {
  member: (member) => member.user.name,
}
