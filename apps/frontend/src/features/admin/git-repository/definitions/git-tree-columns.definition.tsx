import { createColumnHelper } from "@tanstack/react-table"
import { formatBytes } from "@/features/admin/git-repository/model/git-location"
import type { FolderEntry } from "@/features/admin/git-repository/model/types"
import { columnLayoutOf, type DataTableFeatures } from "@/hooks/use-data-table"
import type { SortValue } from "@/lib/sort-rows"

/** Renders the entry's open control (`renderControl`): it needs the page. */
export const GIT_ENTRY_NAME_COLUMN = "name"

function sizeLabel(entry: FolderEntry): string {
  if (entry.size !== null) return formatBytes(entry.size)
  if (entry.kind === "submodule") return "Submódulo"
  return "—"
}

const helper = createColumnHelper<DataTableFeatures, FolderEntry>()

/** A folder's entries, in the order the API gives (folders first). */
export const gitTreeColumns = helper.columns([
  helper.accessor((entry) => entry.name, {
    id: GIT_ENTRY_NAME_COLUMN,
    header: "Nombre",
    size: 480,
    minSize: 200,
    meta: {
      label: "Nombre",
      reorderable: false,
      compact: "primary",
      rowRendered: true,
    },
  }),
  helper.accessor((entry) => entry.size, {
    id: "size",
    header: "Tamaño",
    size: 130,
    meta: {
      label: "Tamaño",
      reorderable: true,
      cellClassName: "text-right tabular-nums",
      headerClassName: "text-right",
    },
    cell: (info) => sizeLabel(info.row.original),
  }),
])

export const gitTreeColumnLayout = columnLayoutOf(gitTreeColumns)

/** Nothing is sortable: the API's order is the one shown. */
export const gitTreeSortValues: Partial<
  Record<string, SortValue<FolderEntry>>
> = {}
