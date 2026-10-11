import { createColumnHelper } from "@tanstack/react-table"
import { Text } from "@/components/shared/brand/typography"
import {
  DataTableIdentityCell,
  type DataTableStatus,
  DataTableStatusCell,
} from "@/components/shared/data-display/data-table-cell-content"
import type { DataTableFilterOption } from "@/components/shared/data-display/data-table-column-filter"
import type { SessionRecord } from "@/features/admin/sessions/model/types"
import { columnLayoutOf, type DataTableFeatures } from "@/hooks/use-data-table"
import type { SortOrdering } from "@/hooks/use-sort-query-param"
import { formatDateTime } from "@/lib/format"

/** The orderings `sessionHistory.list` accepts (its `sort` input). */
export const SESSION_SORT_KEYS = [
  "createdAt",
  "expiresAt",
  "ipAddress",
  "user",
  "status",
] as const

export type SessionSortKey = (typeof SESSION_SORT_KEYS)[number]

export const SESSION_DEFAULT_SORT: SortOrdering<SessionSortKey> = {
  sort: "createdAt",
  order: "desc",
}

/** Holds the row's "Ver información técnica" toggle. */
export const SESSION_ACTIONS_COLUMN = "actions"

export const SESSION_STATUS_OPTIONS: DataTableFilterOption[] = [
  { value: "active", label: "Vigente" },
  { value: "expired", label: "Caducada" },
]

export type SessionStatus = "active" | "expired"

/** The statuses kept in the URL that name a real status. */
export function sessionStatusesOf(values: readonly string[]): SessionStatus[] {
  return values.filter(
    (value): value is SessionStatus => value === "active" || value === "expired"
  )
}

export function isActiveSession(session: SessionRecord): boolean {
  return new Date(session.expiresAt).getTime() > Date.now()
}

function sessionStatus(session: SessionRecord): DataTableStatus {
  if (isActiveSession(session)) return { tone: "primary", label: "Vigente" }
  return { tone: "muted", label: "Caducada" }
}

function dataCell(value: string) {
  return (
    <Text variant="data" tone="muted" className="block truncate">
      {value}
    </Text>
  )
}

function dateTime(value: string) {
  return formatDateTime(value, { includeYear: true })
}

const helper = createColumnHelper<DataTableFeatures, SessionRecord>()

/**
 * The session history's columns. The ids of the sortable ones are the
 * server's sort keys; the technical fields start hidden and stay out of
 * the compact rows, and the expanded row shows all of them whatever
 * columns are visible.
 */
export const sessionColumns = helper.columns([
  helper.accessor((session) => session.user.name, {
    id: "user",
    header: "Usuario",
    size: 240,
    minSize: 160,
    enableSorting: true,
    meta: { label: "Usuario", reorderable: false, compact: "primary" },
    cell: (info) => (
      <DataTableIdentityCell
        primary={info.row.original.user.name}
        secondary={info.row.original.user.email}
      />
    ),
  }),
  helper.accessor((session) => session.ipAddress, {
    id: "ipAddress",
    header: "Dirección IP",
    size: 160,
    enableSorting: true,
    meta: { label: "Dirección IP", reorderable: true },
    cell: (info) => dataCell(info.getValue() ?? "No registrada"),
  }),
  helper.accessor(isActiveSession, {
    id: "status",
    header: "Estado",
    size: 130,
    enableSorting: true,
    meta: { label: "Estado", reorderable: true, compact: "status" },
    cell: (info) => (
      <DataTableStatusCell status={sessionStatus(info.row.original)} />
    ),
  }),
  helper.accessor((session) => session.createdAt, {
    id: "createdAt",
    header: "Iniciada",
    size: 180,
    enableSorting: true,
    meta: { label: "Iniciada", reorderable: true },
    cell: (info) => dataCell(dateTime(info.row.original.createdAt)),
  }),
  helper.accessor((session) => session.expiresAt, {
    id: "expiresAt",
    header: "Caduca",
    size: 180,
    enableSorting: true,
    enableHiding: true,
    meta: {
      label: "Caduca",
      reorderable: true,
      defaultHidden: true,
      compact: "omit",
    },
    cell: (info) => dataCell(dateTime(info.row.original.expiresAt)),
  }),
  helper.accessor((session) => session.updatedAt, {
    id: "updatedAt",
    header: "Actualizada",
    size: 180,
    enableHiding: true,
    meta: {
      label: "Actualizada",
      reorderable: true,
      defaultHidden: true,
      compact: "omit",
    },
    cell: (info) => dataCell(dateTime(info.row.original.updatedAt)),
  }),
  helper.accessor((session) => session.userAgent, {
    id: "userAgent",
    header: "User-agent",
    size: 260,
    enableHiding: true,
    meta: {
      label: "User-agent",
      reorderable: true,
      defaultHidden: true,
      compact: "omit",
    },
    cell: (info) => dataCell(info.getValue() ?? "No registrado"),
  }),
  helper.accessor((session) => session.id, {
    id: "sessionId",
    header: "ID de sesión",
    size: 220,
    enableHiding: true,
    meta: {
      label: "ID de sesión",
      reorderable: true,
      defaultHidden: true,
      compact: "omit",
    },
    cell: (info) => dataCell(info.getValue()),
  }),
  helper.accessor((session) => session.userId, {
    id: "userId",
    header: "ID de usuario",
    size: 220,
    enableHiding: true,
    meta: {
      label: "ID de usuario",
      reorderable: true,
      defaultHidden: true,
      compact: "omit",
    },
    cell: (info) => dataCell(info.getValue()),
  }),
  helper.accessor((session) => session.activeOrganizationId, {
    id: "activeOrganizationId",
    header: "Organización activa",
    size: 200,
    enableHiding: true,
    meta: {
      label: "Organización activa",
      reorderable: true,
      defaultHidden: true,
      compact: "omit",
    },
    cell: (info) => dataCell(info.getValue() ?? "Ninguna"),
  }),
  helper.accessor((session) => session.activeTeamId, {
    id: "activeTeamId",
    header: "Equipo activo",
    size: 200,
    enableHiding: true,
    meta: {
      label: "Equipo activo",
      reorderable: true,
      defaultHidden: true,
      compact: "omit",
    },
    cell: (info) => dataCell(info.getValue() ?? "Ninguno"),
  }),
  helper.display({
    id: SESSION_ACTIONS_COLUMN,
    header: "Acciones",
    size: 110,
    minSize: 90,
    meta: {
      label: "Acciones",
      reorderable: false,
      cellClassName: "text-right",
      headerClassName: "text-right",
    },
  }),
])

export const sessionColumnLayout = columnLayoutOf(sessionColumns)
