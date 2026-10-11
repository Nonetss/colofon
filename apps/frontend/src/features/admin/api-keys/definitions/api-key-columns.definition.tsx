import { createColumnHelper } from "@tanstack/react-table"
import { Text } from "@/components/shared/brand/typography"
import {
  DataTableIdentityCell,
  type DataTableStatus,
  DataTableStatusCell,
} from "@/components/shared/data-display/data-table-cell-content"
import type { RowActionDescriptor } from "@/components/shared/data-display/row-action-items"
import type { ApiKeyListItem } from "@/features/admin/api-keys/model/types"
import { columnLayoutOf, type DataTableFeatures } from "@/hooks/use-data-table"
import type { SortOrdering } from "@/hooks/use-sort-query-param"
import { formatDate } from "@/lib/format"
import { iconRef } from "@/lib/icon-registry"
import type { SortValue } from "@/lib/sort-rows"

export interface ApiKeysRowContext {
  deletingId: string | null
  onDelete: (key: ApiKeyListItem) => void
}

export const API_KEY_ACTIONS_COLUMN = "actions"

export const API_KEY_SORT_KEYS = [
  "name",
  "status",
  "createdAt",
  "expiresAt",
] as const

export type ApiKeySortKey = (typeof API_KEY_SORT_KEYS)[number]

/** Better Auth's own order: the list starts unsorted. */
export const API_KEY_DEFAULT_SORT: SortOrdering<ApiKeySortKey> | null = null

export function apiKeyName(key: ApiKeyListItem): string {
  return key.name?.trim() || "Sin nombre"
}

function apiKeyHint(key: ApiKeyListItem): string {
  if (key.start) return key.start
  if (key.prefix) return key.prefix
  return `${key.id.slice(0, 8)}…`
}

function apiKeyStatus(key: ApiKeyListItem): DataTableStatus {
  if (key.enabled) return { tone: "primary", label: "Activa" }
  return { tone: "border", label: "Pausa" }
}

function expiryLabel(key: ApiKeyListItem): string {
  if (!key.expiresAt) return "Sin caducidad"
  return formatDate(key.expiresAt)
}

function timeOf(value: string | Date | null | undefined): number | null {
  if (!value) return null
  return new Date(value).getTime()
}

const helper = createColumnHelper<DataTableFeatures, ApiKeyListItem>()

export const apiKeyColumns = helper.columns([
  helper.accessor(apiKeyName, {
    id: "name",
    header: "Nombre",
    size: 260,
    minSize: 160,
    enableSorting: true,
    meta: { label: "Nombre", reorderable: false, compact: "primary" },
    cell: (info) => (
      <DataTableIdentityCell
        primary={apiKeyName(info.row.original)}
        secondary={apiKeyHint(info.row.original)}
      />
    ),
  }),
  helper.accessor((key) => key.enabled, {
    id: "status",
    header: "Estado",
    size: 130,
    enableSorting: true,
    meta: { label: "Estado", reorderable: true, compact: "status" },
    cell: (info) => (
      <DataTableStatusCell status={apiKeyStatus(info.row.original)} />
    ),
  }),
  helper.accessor((key) => key.createdAt, {
    id: "createdAt",
    header: "Creada",
    size: 150,
    enableSorting: true,
    meta: { label: "Creada", reorderable: true },
    cell: (info) => (
      <Text tone="muted" className="tabular-nums">
        {formatDate(info.row.original.createdAt)}
      </Text>
    ),
  }),
  helper.accessor((key) => key.expiresAt, {
    id: "expiresAt",
    header: "Caducidad",
    size: 150,
    enableSorting: true,
    meta: { label: "Caducidad", reorderable: true },
    cell: (info) => (
      <Text tone="muted" className="tabular-nums">
        {expiryLabel(info.row.original)}
      </Text>
    ),
  }),
  helper.display({
    id: API_KEY_ACTIONS_COLUMN,
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

export const apiKeyColumnLayout = columnLayoutOf(apiKeyColumns)

export const apiKeySortValues: Partial<
  Record<ApiKeySortKey, SortValue<ApiKeyListItem>>
> = {
  name: apiKeyName,
  status: (key) => Number(key.enabled),
  createdAt: (key) => timeOf(key.createdAt),
  expiresAt: (key) => timeOf(key.expiresAt),
}

export const apiKeyActions: RowActionDescriptor<
  ApiKeyListItem,
  ApiKeysRowContext
>[] = [
  {
    key: "delete",
    label: "Eliminar",
    icon: iconRef("actions", "delete"),
    destructive: true,
    onSelect: (key, ctx) => ctx.onDelete(key),
  },
]
