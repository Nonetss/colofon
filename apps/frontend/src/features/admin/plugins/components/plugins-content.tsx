import { getIcon } from "@/lib/icon-registry"

const Blocks = getIcon("admin", "plugins")

import { useMemo } from "react"
import { DataTableView } from "@/components/shared/data-display/data-table-view"
import { HeroCount } from "@/components/shared/layout/page-hero"
import { ResourceOverview } from "@/components/shared/resource/resource-overview"
import {
  PLUGIN_DEFAULT_SORT,
  PLUGIN_SORT_KEYS,
  pluginColumnLayout,
  pluginColumns,
  pluginSortValues,
} from "@/features/admin/plugins/definitions/plugin-columns.definition"
import { usePluginsList } from "@/features/admin/plugins/hooks/use-plugins"
import { useColumnPreferences } from "@/hooks/use-column-preferences"
import { columnPreferenceProps, useDataTable } from "@/hooks/use-data-table"
import { useSortQueryParam } from "@/hooks/use-sort-query-param"
import { sortRows } from "@/lib/sort-rows"

export function PluginsContent() {
  const { data: plugins = [], isPending, isError, refetch } = usePluginsList()
  const preferences = useColumnPreferences("admin-plugins", pluginColumnLayout)
  const [sorting, setSorting] = useSortQueryParam(
    PLUGIN_SORT_KEYS,
    PLUGIN_DEFAULT_SORT
  )
  const rows = useMemo(
    () => sortRows(plugins, sorting, pluginSortValues),
    [plugins, sorting]
  )
  const table = useDataTable({
    data: rows,
    columns: pluginColumns,
    getRowId: (plugin) => plugin.id,
    sorting,
    onSortingChange: setSorting,
    ...columnPreferenceProps(preferences),
  })

  return (
    <ResourceOverview
      maxWidth="80%"
      surface="admin-plugins"
      description="Plugins de Better Auth activos en el backend. Vista de solo lectura."
      heroMeta={
        <HeroCount segments={[{ count: plugins.length, label: "activos" }]} />
      }
      query={{ data: plugins, isPending, isError, refetch }}
      loading="Cargando plugins..."
      error={{
        icon: <Blocks className="size-6" />,
        title: "No se pudieron cargar los plugins",
        description:
          "Comprueba tu conexión y tus permisos de administración; después, vuelve a intentarlo.",
      }}
    >
      {() => (
        <DataTableView
          table={table}
          label="Plugins"
          idPrefix="admin-plugins"
          onResetColumns={preferences.reset}
        />
      )}
    </ResourceOverview>
  )
}
