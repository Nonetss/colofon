import { createColumnHelper } from "@tanstack/react-table"
import { Text } from "@/components/shared/brand/typography"
import type { RowActionDescriptor } from "@/components/shared/data-display/row-action-items"
import { ROLE_LABELS } from "@/features/profile/organizations/definitions/role-options"
import { canEditOrganization } from "@/features/profile/organizations/model/permissions"
import type { MyOrganization } from "@/features/profile/organizations/model/types"
import { columnLayoutOf, type DataTableFeatures } from "@/hooks/use-data-table"
import type { SortOrdering } from "@/hooks/use-sort-query-param"
import { formatDate } from "@/lib/format"
import { iconRef } from "@/lib/icon-registry"
import type { SortValue } from "@/lib/sort-rows"

export interface MyOrganizationsRowContext {
  onOpen: (organization: MyOrganization) => void
  onEdit: (organization: MyOrganization) => void
  onDelete: (organization: MyOrganization) => void
  onLeave: (organization: MyOrganization) => void
}

/** The identifying column: the row renders it, as it opens the sheet. */
export const ORGANIZATION_NAME_COLUMN = "name"

export const ORGANIZATION_SORT_KEYS = [
  "name",
  "role",
  "memberCount",
  "createdAt",
] as const

export type OrganizationSortKey = (typeof ORGANIZATION_SORT_KEYS)[number]

/** `myOrganization.list`'s own order. */
export const ORGANIZATION_DEFAULT_SORT: SortOrdering<OrganizationSortKey> = {
  sort: "name",
  order: "asc",
}

const helper = createColumnHelper<DataTableFeatures, MyOrganization>()

export const organizationColumns = helper.columns([
  helper.accessor((organization) => organization.name, {
    id: ORGANIZATION_NAME_COLUMN,
    header: "Nombre",
    size: 260,
    minSize: 160,
    enableSorting: true,
    meta: {
      label: "Nombre",
      reorderable: false,
      compact: "primary",
      rowRendered: true,
    },
  }),
  helper.accessor((organization) => ROLE_LABELS[organization.role], {
    id: "role",
    header: "Tu rol",
    size: 150,
    enableSorting: true,
    meta: { label: "Tu rol", reorderable: true },
  }),
  helper.accessor((organization) => organization.memberCount, {
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
  helper.accessor((organization) => organization.createdAt, {
    id: "createdAt",
    header: "Creada",
    size: 140,
    enableSorting: true,
    meta: { label: "Creada", reorderable: true },
    cell: (info) => (
      <Text tone="muted" className="tabular-nums">
        {formatDate(info.row.original.createdAt)}
      </Text>
    ),
  }),
  helper.display({
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    size: 64,
    enableResizing: false,
    meta: {
      label: "Acciones",
      reorderable: false,
      cellClassName: "text-right",
    },
  }),
])

export const organizationColumnLayout = columnLayoutOf(organizationColumns)

export const organizationSortValues: Partial<
  Record<OrganizationSortKey, SortValue<MyOrganization>>
> = {
  name: (organization) => organization.name,
  role: (organization) => ROLE_LABELS[organization.role],
  memberCount: (organization) => organization.memberCount,
  createdAt: (organization) => new Date(organization.createdAt).getTime(),
}

function notEditable(organization: MyOrganization): boolean {
  return !canEditOrganization(organization.role)
}

export const organizationActions: RowActionDescriptor<
  MyOrganization,
  MyOrganizationsRowContext
>[] = [
  {
    key: "members",
    label: "Ver miembros",
    icon: iconRef("admin", "users"),
    onSelect: (organization, ctx) => ctx.onOpen(organization),
  },
  {
    key: "edit",
    label: "Editar",
    icon: iconRef("actions", "edit"),
    hidden: notEditable,
    onSelect: (organization, ctx) => ctx.onEdit(organization),
  },
  {
    key: "leave",
    label: "Salir de la organización",
    icon: iconRef("identity", "userX"),
    destructive: true,
    onSelect: (organization, ctx) => ctx.onLeave(organization),
  },
  {
    key: "delete",
    label: "Eliminar",
    icon: iconRef("actions", "delete"),
    destructive: true,
    hidden: notEditable,
    onSelect: (organization, ctx) => ctx.onDelete(organization),
  },
]
