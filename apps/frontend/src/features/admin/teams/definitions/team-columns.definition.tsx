import { createColumnHelper } from "@tanstack/react-table"
import { Text } from "@/components/shared/brand/typography"
import type { RowActionDescriptor } from "@/components/shared/data-display/row-action-items"
import type { Team } from "@/features/admin/teams/model/types"
import { columnLayoutOf, type DataTableFeatures } from "@/hooks/use-data-table"
import type { SortOrdering } from "@/hooks/use-sort-query-param"
import { formatDate } from "@/lib/format"
import { iconRef } from "@/lib/icon-registry"
import type { SortValue } from "@/lib/sort-rows"

export interface TeamsRowContext {
  onOpenMembers: (team: Team) => void
  onEdit: (team: Team) => void
  onDelete: (team: Team) => void
}

/** Columns the row renders: the name opens the members sheet and the
 *  organization name comes from the page's organization list. */
export const TEAM_NAME_COLUMN = "name"
export const TEAM_ORGANIZATION_COLUMN = "organization"

export const TEAM_SORT_KEYS = [
  "name",
  "organization",
  "memberCount",
  "createdAt",
] as const

export type TeamSortKey = (typeof TEAM_SORT_KEYS)[number]

/** `organization.listTeams`'s own order. */
export const TEAM_DEFAULT_SORT: SortOrdering<TeamSortKey> = {
  sort: "createdAt",
  order: "desc",
}

const helper = createColumnHelper<DataTableFeatures, Team>()

export const teamColumns = helper.columns([
  helper.accessor((team) => team.name, {
    id: TEAM_NAME_COLUMN,
    header: "Nombre",
    size: 240,
    minSize: 140,
    enableSorting: true,
    meta: {
      label: "Nombre",
      reorderable: false,
      compact: "primary",
      rowRendered: true,
    },
  }),
  helper.accessor((team) => team.organizationId, {
    id: TEAM_ORGANIZATION_COLUMN,
    header: "Organización",
    size: 220,
    enableSorting: true,
    meta: { label: "Organización", reorderable: true, rowRendered: true },
  }),
  helper.accessor((team) => team.memberCount, {
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
  helper.accessor((team) => team.createdAt, {
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

export const teamColumnLayout = columnLayoutOf(teamColumns)

/** Sort values for the teams table; the organization sorts by its name. */
export function teamSortValues(
  orgNameById: Map<string, string>
): Partial<Record<TeamSortKey, SortValue<Team>>> {
  return {
    name: (team) => team.name,
    organization: (team) => orgNameById.get(team.organizationId) ?? null,
    memberCount: (team) => team.memberCount,
    createdAt: (team) => new Date(team.createdAt).getTime(),
  }
}

export const teamActions: RowActionDescriptor<Team, TeamsRowContext>[] = [
  {
    key: "members",
    label: "Ver miembros",
    icon: iconRef("admin", "teams"),
    onSelect: (team, ctx) => ctx.onOpenMembers(team),
  },
  {
    key: "edit",
    label: "Editar",
    icon: iconRef("actions", "edit"),
    onSelect: (team, ctx) => ctx.onEdit(team),
  },
  {
    key: "delete",
    label: "Eliminar",
    icon: iconRef("actions", "delete"),
    destructive: true,
    onSelect: (team, ctx) => ctx.onDelete(team),
  },
]
