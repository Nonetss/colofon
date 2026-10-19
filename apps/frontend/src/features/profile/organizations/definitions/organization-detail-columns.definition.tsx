import { createColumnHelper } from "@tanstack/react-table"
import { Text } from "@/components/shared/brand/typography"
import { DataTableIdentityCell } from "@/components/shared/data-display/data-table-cell-content"
import { UserAvatar } from "@/components/shared/user/avatar"
import { ROLE_LABELS } from "@/features/profile/organizations/definitions/role-options"
import type {
  OrganizationInvitation,
  OrganizationMember,
} from "@/features/profile/organizations/model/types"
import { columnLayoutOf, type DataTableFeatures } from "@/hooks/use-data-table"
import { formatDate } from "@/lib/format"
import type { SortValue } from "@/lib/sort-rows"

/**
 * The tables of an organization's sheet: its members and its pending
 * invitations, as tables at every width with a local sort. The role select
 * and the row controls depend on the viewer's role, so the sheet renders
 * them (`rowRendered` and display columns).
 */

export const MEMBER_ROLE_COLUMN = "role"
export const DETAIL_ACTIONS_COLUMN = "actions"

// The icon-sm button (32px) plus the cell's p-2 on both sides.
const ACTIONS_COLUMN_SIZE = 48

const actionsColumnMeta = {
  label: "Acciones",
  reorderable: false,
  cellClassName: "text-right",
}

function hiddenHeader(label: string) {
  return () => <span className="sr-only">{label}</span>
}

const member = createColumnHelper<DataTableFeatures, OrganizationMember>()

export const memberColumns = member.columns([
  member.accessor((row) => row.name, {
    id: "member",
    header: "Miembro",
    size: 240,
    minSize: 160,
    enableSorting: true,
    meta: { label: "Miembro", reorderable: false },
    cell: (info) => (
      <DataTableIdentityCell
        primary={info.row.original.name}
        secondary={info.row.original.email}
        leading={
          <UserAvatar
            displayName={info.row.original.name}
            email={info.row.original.email}
            imageUrl={info.row.original.image}
            size="sm"
          />
        }
      />
    ),
  }),
  member.accessor((row) => ROLE_LABELS[row.role], {
    id: MEMBER_ROLE_COLUMN,
    header: "Rol",
    size: 170,
    enableSorting: true,
    meta: { label: "Rol", reorderable: true, rowRendered: true },
  }),
  member.accessor((row) => row.createdAt, {
    id: "createdAt",
    header: "Desde",
    size: 120,
    enableSorting: true,
    meta: { label: "Desde", reorderable: true },
    cell: (info) => (
      <Text tone="muted" className="tabular-nums">
        {formatDate(info.row.original.createdAt)}
      </Text>
    ),
  }),
  member.display({
    id: DETAIL_ACTIONS_COLUMN,
    header: hiddenHeader("Acciones"),
    size: ACTIONS_COLUMN_SIZE,
    enableResizing: false,
    meta: actionsColumnMeta,
  }),
])

export const memberColumnLayout = columnLayoutOf(memberColumns)

export const memberSortValues: Partial<
  Record<string, SortValue<OrganizationMember>>
> = {
  member: (row) => row.name,
  [MEMBER_ROLE_COLUMN]: (row) => ROLE_LABELS[row.role],
  createdAt: (row) => new Date(row.createdAt).getTime(),
}

const invitation = createColumnHelper<
  DataTableFeatures,
  OrganizationInvitation
>()

export const invitationColumns = invitation.columns([
  invitation.accessor((row) => row.email, {
    id: "email",
    header: "Email",
    size: 240,
    minSize: 160,
    enableSorting: true,
    meta: { label: "Email", reorderable: false },
    cell: (info) => <DataTableIdentityCell primary={info.getValue()} />,
  }),
  invitation.accessor((row) => ROLE_LABELS[row.role], {
    id: "role",
    header: "Rol",
    size: 140,
    enableSorting: true,
    meta: { label: "Rol", reorderable: true },
  }),
  invitation.accessor((row) => row.expiresAt, {
    id: "expiresAt",
    header: "Caduca",
    size: 120,
    enableSorting: true,
    meta: { label: "Caduca", reorderable: true },
    cell: (info) => (
      <Text tone="muted" className="tabular-nums">
        {formatDate(info.row.original.expiresAt)}
      </Text>
    ),
  }),
  invitation.display({
    id: DETAIL_ACTIONS_COLUMN,
    header: hiddenHeader("Acciones"),
    size: ACTIONS_COLUMN_SIZE,
    enableResizing: false,
    meta: actionsColumnMeta,
  }),
])

export const invitationColumnLayout = columnLayoutOf(invitationColumns)

export const invitationSortValues: Partial<
  Record<string, SortValue<OrganizationInvitation>>
> = {
  email: (row) => row.email,
  role: (row) => ROLE_LABELS[row.role],
  expiresAt: (row) => new Date(row.expiresAt).getTime(),
}
