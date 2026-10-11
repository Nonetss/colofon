import { createColumnHelper } from "@tanstack/react-table"
import { Text } from "@/components/shared/brand/typography"
import type { RowActionDescriptor } from "@/components/shared/data-display/row-action-items"
import type { Organization } from "@/features/admin/organizations/model/types"
import { columnLayoutOf, type DataTableFeatures } from "@/hooks/use-data-table"
import type { SortOrdering } from "@/hooks/use-sort-query-param"
import { formatDate } from "@/lib/format"
import { iconRef } from "@/lib/icon-registry"
import type { SortValue } from "@/lib/sort-rows"

export interface OrganizationsRowContext {
  onOpenDetail: (id: string) => void
  onEdit: (organization: Organization) => void
  onDelete: (organization: Organization) => void
}

/** The identifying column: the row renders it, as it opens the detail. */
export const ORGANIZATION_NAME_COLUMN = "name"

export const ORGANIZATION_SORT_KEYS = [
  "name",
  "memberCount",
  "teamCount",
  "createdAt",
] as const

export type OrganizationSortKey = (typeof ORGANIZATION_SORT_KEYS)[number]

/** `organization.list`'s own order. */
export const ORGANIZATION_DEFAULT_SORT: SortOrdering<OrganizationSortKey> = {
  sort: "createdAt",
  order: "desc",
}

const helper = createColumnHelper<DataTableFeatures, Organization>()

export const organizationColumns = helper.columns([
  helper.accessor((org) => org.name, {
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
  helper.accessor((org) => org.memberCount, {
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
  helper.accessor((org) => org.teamCount, {
    id: "teamCount",
    header: "Equipos",
    size: 120,
    enableSorting: true,
    meta: {
      label: "Equipos",
      reorderable: true,
      cellClassName: "text-right tabular-nums",
      headerClassName: "text-right",
    },
  }),
  helper.accessor((org) => org.createdAt, {
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
  Record<OrganizationSortKey, SortValue<Organization>>
> = {
  name: (org) => org.name,
  memberCount: (org) => org.memberCount,
  teamCount: (org) => org.teamCount,
  createdAt: (org) => new Date(org.createdAt).getTime(),
}

export const organizationActions: RowActionDescriptor<
  Organization,
  OrganizationsRowContext
>[] = [
  {
    key: "members",
    label: "Ver miembros",
    icon: iconRef("admin", "users"),
    onSelect: (org, ctx) => ctx.onOpenDetail(org.id),
  },
  {
    key: "edit",
    label: "Editar",
    icon: iconRef("actions", "edit"),
    onSelect: (org, ctx) => ctx.onEdit(org),
  },
  {
    key: "delete",
    label: "Eliminar",
    icon: iconRef("actions", "delete"),
    destructive: true,
    onSelect: (org, ctx) => ctx.onDelete(org),
  },
]
