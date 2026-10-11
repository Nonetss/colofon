import { createColumnHelper } from "@tanstack/react-table"
import { Text } from "@/components/shared/brand/typography"
import {
  DataTableIdentityCell,
  type DataTableStatus,
  DataTableStatusCell,
} from "@/components/shared/data-display/data-table-cell-content"
import type { DataTableFilterOption } from "@/components/shared/data-display/data-table-column-filter"
import type { RowActionDescriptor } from "@/components/shared/data-display/row-action-items"
import type { UserRow } from "@/features/admin/users/model/types"
import { columnLayoutOf, type DataTableFeatures } from "@/hooks/use-data-table"
import type { SortOrdering } from "@/hooks/use-sort-query-param"
import { isAdminUser } from "@/lib/auth"
import { formatDate } from "@/lib/format"
import { type IconRef, iconRef } from "@/lib/icon-registry"
import { userDisplayName } from "@/lib/user-display"

export interface UsersRowContext {
  currentUserId: string | undefined
  onChangePassword: (user: UserRow) => void
  onToggleAdmin: (user: UserRow) => void
  onUnban: (userId: string) => void
  onBan: (user: UserRow) => void
  onDelete: (user: UserRow) => void
}

/** The orderings `adminUser.list` accepts (its `sort` input). */
export const USER_SORT_KEYS = [
  "name",
  "email",
  "role",
  "banned",
  "createdAt",
] as const

export type UserSortKey = (typeof USER_SORT_KEYS)[number]

export type UserRole = "admin" | "user"
export type UserStatus = "active" | "banned"

export const USER_ROLE_OPTIONS: DataTableFilterOption[] = [
  { value: "admin", label: "Administrador" },
  { value: "user", label: "Usuario" },
]

export const USER_STATUS_OPTIONS: DataTableFilterOption[] = [
  { value: "active", label: "Activo" },
  { value: "banned", label: "Baneado" },
]

/** The roles kept in the URL that name a real role. */
export function userRolesOf(values: readonly string[]): UserRole[] {
  return values.filter(
    (value): value is UserRole => value === "admin" || value === "user"
  )
}

/** The statuses kept in the URL that name a real status. */
export function userStatusesOf(values: readonly string[]): UserStatus[] {
  return values.filter(
    (value): value is UserStatus => value === "active" || value === "banned"
  )
}

export const USER_DEFAULT_SORT: SortOrdering<UserSortKey> = {
  sort: "createdAt",
  order: "desc",
}

function roleLabel(user: UserRow): string {
  if (isAdminUser(user)) return "Administrador"
  return "Usuario"
}

function userStatus(user: UserRow): DataTableStatus {
  if (!user.banned) return { tone: "primary", label: "Activo" }
  return {
    tone: "destructive",
    label: "Baneado",
    title: user.banReason ?? undefined,
  }
}

const helper = createColumnHelper<DataTableFeatures, UserRow>()

export const userColumns = helper.columns([
  helper.accessor(userDisplayName, {
    id: "name",
    header: "Nombre",
    size: 220,
    minSize: 140,
    enableSorting: true,
    meta: { label: "Nombre", reorderable: false, compact: "primary" },
    cell: (info) => (
      <DataTableIdentityCell
        primary={userDisplayName(info.row.original)}
        secondary={info.row.original.email}
      />
    ),
  }),
  helper.accessor((user) => user.email, {
    id: "email",
    header: "Email",
    size: 240,
    enableSorting: true,
    meta: { label: "Email", reorderable: true, compact: "omit" },
    cell: (info) => (
      <Text tone="muted" className="block truncate">
        {info.row.original.email}
      </Text>
    ),
  }),
  helper.accessor(roleLabel, {
    id: "role",
    header: "Rol",
    size: 140,
    enableSorting: true,
    meta: { label: "Rol", reorderable: true },
  }),
  helper.accessor((user) => user.banned, {
    id: "banned",
    header: "Estado",
    size: 130,
    enableSorting: true,
    meta: { label: "Estado", reorderable: true, compact: "status" },
    cell: (info) => (
      <DataTableStatusCell status={userStatus(info.row.original)} />
    ),
  }),
  helper.accessor((user) => user.createdAt, {
    id: "createdAt",
    header: "Creado",
    size: 140,
    enableSorting: true,
    meta: { label: "Creado", reorderable: true },
    cell: (info) => (
      <Text tone="muted" className="tabular-nums">
        {formatDate(info.row.original.createdAt)}
      </Text>
    ),
  }),
  helper.display({
    id: "actions",
    header: "Acciones",
    size: 100,
    minSize: 90,
    meta: {
      label: "Acciones",
      reorderable: false,
      cellClassName: "text-right",
      headerClassName: "text-right",
    },
  }),
])

export const userColumnLayout = columnLayoutOf(userColumns)

function adminToggleLabel(user: UserRow): string {
  if (isAdminUser(user)) return "Quitar admin"
  return "Hacer admin"
}

function adminToggleIcon(user: UserRow): IconRef {
  if (isAdminUser(user)) return iconRef("security", "restricted")
  return iconRef("security", "security")
}

function banToggleLabel(user: UserRow): string {
  if (user.banned) return "Quitar baneo"
  return "Banear"
}

function banToggleIcon(user: UserRow): IconRef {
  if (user.banned) return iconRef("security", "restricted")
  return iconRef("identity", "userX")
}

function toggleBan(user: UserRow, ctx: UsersRowContext) {
  if (user.banned) {
    ctx.onUnban(user.id)
    return
  }
  ctx.onBan(user)
}

/** The password/admin/ban/delete actions; the last three are disabled on
 *  the administrator's own row. */
export const userActions: RowActionDescriptor<UserRow, UsersRowContext>[] = [
  {
    key: "changePassword",
    label: "Cambiar contraseña",
    icon: iconRef("entities", "apiKey"),
    onSelect: (user, ctx) => ctx.onChangePassword(user),
  },
  {
    key: "toggleAdmin",
    label: adminToggleLabel,
    icon: adminToggleIcon,
    disabled: (user, ctx) => user.id === ctx.currentUserId,
    onSelect: (user, ctx) => ctx.onToggleAdmin(user),
  },
  {
    key: "banToggle",
    label: banToggleLabel,
    icon: banToggleIcon,
    disabled: (user, ctx) => user.id === ctx.currentUserId,
    onSelect: toggleBan,
  },
  {
    key: "delete",
    label: "Eliminar",
    icon: iconRef("actions", "delete"),
    destructive: true,
    disabled: (user, ctx) => user.id === ctx.currentUserId,
    onSelect: (user, ctx) => ctx.onDelete(user),
  },
]
