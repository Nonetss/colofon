import { createColumnHelper } from "@tanstack/react-table"
import { Text } from "@/components/shared/brand/typography"
import {
  DataTableIdentityCell,
  DataTableStatusCell,
} from "@/components/shared/data-display/data-table-cell-content"
import {
  defaultPluginIcon,
  pluginMeta,
} from "@/features/admin/plugins/definitions/plugin-meta.definition"
import type { Plugin } from "@/features/admin/plugins/model/types"
import { columnLayoutOf, type DataTableFeatures } from "@/hooks/use-data-table"
import type { SortOrdering } from "@/hooks/use-sort-query-param"
import type { SortValue } from "@/lib/sort-rows"

export const PLUGIN_SORT_KEYS = ["label", "id"] as const

export type PluginSortKey = (typeof PLUGIN_SORT_KEYS)[number]

/** The server configuration's order: the list starts unsorted. */
export const PLUGIN_DEFAULT_SORT: SortOrdering<PluginSortKey> | null = null

function metaOf(plugin: Plugin) {
  if (!Object.hasOwn(pluginMeta, plugin.id)) return null
  return pluginMeta[plugin.id]
}

export function pluginLabel(plugin: Plugin): string {
  const meta = metaOf(plugin)
  if (!meta) return plugin.id
  return meta.label
}

function pluginDescription(plugin: Plugin): string {
  const meta = metaOf(plugin)
  if (!meta) return `Plugin "${plugin.id}" registrado en Better Auth.`
  return meta.description
}

function PluginName({ plugin }: { plugin: Plugin }) {
  const meta = metaOf(plugin)
  const icon = meta ? meta.icon : defaultPluginIcon
  return (
    <DataTableIdentityCell
      primary={pluginLabel(plugin)}
      leading={<span className="text-primary">{icon}</span>}
    />
  )
}

const helper = createColumnHelper<DataTableFeatures, Plugin>()

export const pluginColumns = helper.columns([
  helper.accessor(pluginLabel, {
    id: "label",
    header: "Plugin",
    size: 200,
    minSize: 140,
    enableSorting: true,
    meta: { label: "Plugin", reorderable: false, compact: "primary" },
    cell: (info) => <PluginName plugin={info.row.original} />,
  }),
  helper.accessor(pluginDescription, {
    id: "description",
    header: "Descripción",
    size: 380,
    meta: {
      label: "Descripción",
      reorderable: true,
      cellClassName: "text-muted-foreground",
    },
  }),
  helper.accessor((plugin) => plugin.id, {
    id: "id",
    header: "Id",
    size: 160,
    enableSorting: true,
    meta: { label: "Id", reorderable: true },
    cell: (info) => (
      <Text variant="data" tone="muted">
        {info.getValue()}
      </Text>
    ),
  }),
  helper.accessor(() => "Activo", {
    id: "status",
    header: "Estado",
    size: 120,
    meta: { label: "Estado", reorderable: true, compact: "status" },
    cell: () => (
      <DataTableStatusCell status={{ tone: "primary", label: "Activo" }} />
    ),
  }),
])

export const pluginColumnLayout = columnLayoutOf(pluginColumns)

export const pluginSortValues: Partial<
  Record<PluginSortKey, SortValue<Plugin>>
> = {
  label: pluginLabel,
  id: (plugin) => plugin.id,
}
