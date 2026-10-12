import { getIcon } from "@/lib/icon-registry"

const UsersRound = getIcon("admin", "teams")

import { createColumnHelper } from "@tanstack/react-table"
import { Text } from "@/components/shared/brand/typography"
import { DataTableIdentityCell } from "@/components/shared/data-display/data-table-cell-content"
import { UserAvatar } from "@/components/shared/user/avatar"
import {
  describePermissions,
  roleLabel,
} from "@/features/admin/organizations/definitions/role-options"
import type {
  OrganizationCustomRole,
  OrganizationDetail,
  OrganizationInvitation,
  OrganizationMember,
} from "@/features/admin/organizations/model/types"
import { columnLayoutOf, type DataTableFeatures } from "@/hooks/use-data-table"
import type { SortValue } from "@/lib/sort-rows"
import { cn } from "@/lib/utils"

/**
 * The tables of the organization detail sheet: members, pending
 * invitations, teams and custom roles. They render as tables at every width
 * (`layout="table"`) with a local sort; their controls (role select, remove,
 * cancel) are display or row-rendered columns the sections render.
 */

export type OrganizationTeam = OrganizationDetail["teams"][number]

export const MEMBER_ROLE_COLUMN = "role"
export const DETAIL_ACTIONS_COLUMN = "actions"

// The sheet is often narrower than its tables, so the actions column is
// pinned to the right edge of the scroll box and stays reachable at any
// width. Its cells must be opaque to cover the cells scrolling under them:
// the body matches the box's `bg-card/40` over the sheet, and the row hover
// adds `bg-muted/50` on top of that.
const stickyCellSurface =
  "bg-[color-mix(in_oklab,var(--card)_40%,var(--background))]"
const stickyCellHover =
  "group-hover:bg-[color-mix(in_oklab,var(--muted)_50%,color-mix(in_oklab,var(--card)_40%,var(--background)))]"
const stickyCellEdge = "shadow-[inset_1px_0_0_0_var(--border)]"

const actionsColumnMeta = {
  label: "Acciones",
  reorderable: false,
  cellClassName: cn(
    "sticky right-0 z-1 text-right",
    stickyCellSurface,
    stickyCellHover,
    stickyCellEdge
  ),
  headerClassName:
    "right-0 z-20 shadow-[inset_1px_0_0_0_var(--border),inset_0_-1px_0_0_var(--border)]",
}

// The icon-sm button (32px) plus the cell's p-2 on both sides.
const ACTIONS_COLUMN_SIZE = 48

function hiddenHeader(label: string) {
  return () => <span className="sr-only">{label}</span>
}

function isRoleName(value: string): value is keyof typeof roleLabel {
  return Object.hasOwn(roleLabel, value)
}

/** The invitation's role in Spanish, or the custom role's own name. */
export function invitationRoleLabel(invitation: OrganizationInvitation) {
  const role = invitation.role ?? "member"
  if (isRoleName(role)) return roleLabel[role]
  return role
}

const invitationStatusLabel: Record<string, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  rejected: "Rechazada",
  canceled: "Cancelada",
}

function statusLabelOf(invitation: OrganizationInvitation): string {
  if (!Object.hasOwn(invitationStatusLabel, invitation.status)) {
    return invitation.status
  }
  return invitationStatusLabel[invitation.status]
}

const member = createColumnHelper<DataTableFeatures, OrganizationMember>()

export const memberColumns = member.columns([
  member.accessor((row) => row.user.name, {
    id: "member",
    header: "Miembro",
    size: 240,
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
  member.accessor((row) => row.role, {
    id: MEMBER_ROLE_COLUMN,
    header: "Rol",
    size: 160,
    enableSorting: true,
    meta: { label: "Rol", reorderable: true, rowRendered: true },
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
  member: (row) => row.user.name,
  [MEMBER_ROLE_COLUMN]: (row) => row.role,
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
  invitation.accessor(invitationRoleLabel, {
    id: "role",
    header: "Rol",
    size: 140,
    enableSorting: true,
    meta: { label: "Rol", reorderable: true },
  }),
  invitation.accessor(statusLabelOf, {
    id: "status",
    header: "Estado",
    size: 120,
    enableSorting: true,
    meta: { label: "Estado", reorderable: true },
    cell: (info) => <Text tone="muted">{info.getValue()}</Text>,
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
  role: invitationRoleLabel,
  status: statusLabelOf,
}

const team = createColumnHelper<DataTableFeatures, OrganizationTeam>()

export const teamColumns = team.columns([
  team.accessor((row) => row.name, {
    id: "name",
    header: "Equipo",
    size: 240,
    minSize: 160,
    enableSorting: true,
    meta: { label: "Equipo", reorderable: false },
    cell: (info) => (
      <DataTableIdentityCell
        primary={info.getValue()}
        leading={
          <span className="flex size-8 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
            <UsersRound className="size-4" />
          </span>
        }
      />
    ),
  }),
  team.accessor((row) => row.memberCount, {
    id: "memberCount",
    header: "Miembros",
    size: 120,
    enableSorting: true,
    meta: {
      label: "Miembros",
      reorderable: true,
      cellClassName: "text-right tabular-nums",
      headerClassName: "text-right",
    },
  }),
])

export const teamColumnLayout = columnLayoutOf(teamColumns)

export const teamSortValues: Partial<
  Record<string, SortValue<OrganizationTeam>>
> = {
  name: (row) => row.name,
  memberCount: (row) => row.memberCount,
}

const role = createColumnHelper<DataTableFeatures, OrganizationCustomRole>()

export const roleColumns = role.columns([
  role.accessor((row) => row.role, {
    id: "role",
    header: "Rol",
    size: 180,
    minSize: 120,
    enableSorting: true,
    meta: { label: "Rol", reorderable: false },
    cell: (info) => <DataTableIdentityCell primary={info.getValue()} />,
  }),
  role.accessor((row) => describePermissions(row.permission), {
    id: "permissions",
    header: "Permisos",
    size: 280,
    meta: {
      label: "Permisos",
      reorderable: true,
      cellClassName: "text-muted-foreground",
    },
  }),
  role.display({
    id: DETAIL_ACTIONS_COLUMN,
    header: hiddenHeader("Acciones"),
    size: ACTIONS_COLUMN_SIZE,
    enableResizing: false,
    meta: actionsColumnMeta,
  }),
])

export const roleColumnLayout = columnLayoutOf(roleColumns)

export const roleSortValues: Partial<
  Record<string, SortValue<OrganizationCustomRole>>
> = {
  role: (row) => row.role,
}
