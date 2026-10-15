import { DataTableIdentityCell } from "@/components/shared/data-display/data-table-cell-content"
import { DataTableView } from "@/components/shared/data-display/data-table-view"
import {
  GIT_ENTRY_NAME_COLUMN,
  gitTreeColumnLayout,
  gitTreeColumns,
  gitTreeSortValues,
} from "@/features/admin/git-repository/definitions/git-tree-columns.definition"
import type { FolderEntry } from "@/features/admin/git-repository/model/types"
import { useLocalDataTable } from "@/hooks/use-data-table"
import { getIcon } from "@/lib/icon-registry"

const ICONS = {
  folder: getIcon("entities", "folder"),
  file: getIcon("entities", "file"),
  submodule: getIcon("entities", "submodule"),
} as const

interface GitFolderTableProps {
  entries: FolderEntry[]
  /** Opens a folder or a file; a submodule can't be opened. */
  onOpen: (entry: FolderEntry) => void
}

/** The entries of one folder; a name opens its folder or file. */
export function GitFolderTable({ entries, onOpen }: GitFolderTableProps) {
  const { table, preferences } = useLocalDataTable({
    tableId: "admin-git-tree",
    rows: entries,
    columns: gitTreeColumns,
    layout: gitTreeColumnLayout,
    getRowId: (entry) => entry.path,
    sortValues: gitTreeSortValues,
  })

  return (
    <DataTableView
      table={table}
      label="Contenido de la carpeta"
      idPrefix="admin-git-tree"
      onResetColumns={preferences.reset}
      renderControl={(entry, columnId) => {
        if (columnId !== GIT_ENTRY_NAME_COLUMN) return null
        const Icon = ICONS[entry.kind]
        return (
          <DataTableIdentityCell
            primary={entry.name}
            leading={<Icon className="size-4 text-muted-foreground" />}
            onOpen={openOf(entry, onOpen)}
            label={`Abrir ${entry.name}`}
          />
        )
      }}
      emptyMessage="La carpeta está vacía"
    />
  )
}

function openOf(
  entry: FolderEntry,
  onOpen: (entry: FolderEntry) => void
): (() => void) | undefined {
  if (entry.kind === "submodule") return undefined
  return () => onOpen(entry)
}
