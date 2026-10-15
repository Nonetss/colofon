import { getIcon } from "@/lib/icon-registry"

const CheckIcon = getIcon("controls", "check")
const CloseIcon = getIcon("controls", "close")
const ColumnsIcon = getIcon("views", "columns")
const CopyIcon = getIcon("actions", "copy")
const DownloadIcon = getIcon("actions", "download")
const FullscreenIcon = getIcon("views", "fullscreen")
const LinkIcon = getIcon("actions", "copyLink")

import type { ComponentType, KeyboardEvent } from "react"
import { Text } from "@/components/shared/brand/typography"
import { Hint } from "@/components/shared/feedback/hint"
import { CheckboxRow } from "@/components/shared/form/checkbox-row"
import { SearchInput } from "@/components/shared/form/search-input"
import { Button } from "@/components/ui/button"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { TableChip } from "@/features/docs/page/model/doc-table"
import type { TableColumn } from "@/features/docs/page/model/table-view"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"

function chipKey(chip: TableChip): string {
  if (chip.kind === "filter") return chip.column
  return "query"
}

/** An icon-only action of the toolbar, named by its `aria-label` and `Hint`. */
function ToolbarAction({
  label,
  icon: Icon,
  onClick,
}: {
  label: string
  icon: ComponentType<{ className?: string }>
  onClick: () => void
}) {
  return (
    <Hint label={label}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        onClick={onClick}
        className="text-muted-foreground hover:text-foreground"
      >
        <Icon className="size-4" />
      </Button>
    </Hint>
  )
}

/** Copies what `text()` gives when pressed, and says so for a moment. */
function CopyAction({
  label,
  copiedLabel,
  icon,
  text,
}: {
  label: string
  copiedLabel: string
  icon: ComponentType<{ className?: string }>
  text: () => string
}) {
  const { copy, copied } = useCopyToClipboard({
    onError: "No se pudo copiar",
  })
  const shown = copied ? copiedLabel : label
  const shownIcon = copied ? CheckIcon : icon
  return (
    <ToolbarAction
      label={shown}
      icon={shownIcon}
      onClick={() => {
        void copy(text())
      }}
    />
  )
}

/** The columns shown, ticked; the first one can't be hidden. */
function ColumnsMenu({
  columns,
  hidden,
  onToggle,
}: {
  columns: readonly TableColumn[]
  hidden: readonly string[]
  onToggle: (column: string, shown: boolean) => void
}) {
  return (
    <Popover>
      <Hint label="Columnas">
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Columnas"
              className="text-muted-foreground hover:text-foreground"
            />
          }
        >
          <ColumnsIcon className="size-4" />
        </PopoverTrigger>
      </Hint>
      <PopoverContent align="end" className="w-60 p-2">
        <Text as="p" variant="label" tone="muted" className="px-2 py-1">
          Columnas
        </Text>
        <ul className="grid gap-0.5">
          {columns.map((column, index) => {
            const id = `doc-table-column-${column.id}`
            return (
              <CheckboxRow
                key={column.id}
                id={id}
                label={column.header || `Columna ${index + 1}`}
                checked={!hidden.includes(column.id)}
                disabled={index === 0}
                onCheckedChange={(checked) => onToggle(column.id, checked)}
              />
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

export interface DocTableToolbarProps {
  query: string
  onQueryChange: (query: string) => void
  /** "12 filas", or "3 de 12 filas". */
  count: string
  columns: readonly TableColumn[]
  hidden: readonly string[]
  onToggleColumn: (column: string, shown: boolean) => void
  chips: readonly TableChip[]
  onRemoveChip: (chip: TableChip) => void
  onClearFilters: () => void
  markdown: () => string
  viewLink: () => string
  onDownload: () => void
  fullscreen: boolean
  onFullscreen: () => void
}

/**
 * Over a table with 2 rows or more: the filter box, the row count, the
 * actions, and a chip per active filter.
 */
export function DocTableToolbar({
  query,
  onQueryChange,
  count,
  columns,
  hidden,
  onToggleColumn,
  chips,
  onRemoveChip,
  onClearFilters,
  markdown,
  viewLink,
  onDownload,
  fullscreen,
  onFullscreen,
}: DocTableToolbarProps) {
  const clearOnEscape = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || query === "") return
    event.preventDefault()
    event.stopPropagation()
    onQueryChange("")
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <SearchInput
          value={query}
          onValueChange={onQueryChange}
          onKeyDown={clearOnEscape}
          placeholder="Filtrar filas… (columna:valor)"
          label="Filtrar las filas de la tabla"
          className="w-full max-w-72"
        />
        <Text variant="data" tone="muted" aria-live="polite">
          {count}
        </Text>
        <div className="ml-auto flex items-center gap-0.5">
          <ColumnsMenu
            columns={columns}
            hidden={hidden}
            onToggle={onToggleColumn}
          />
          <CopyAction
            label="Copiar en Markdown"
            copiedLabel="Copiado"
            icon={CopyIcon}
            text={markdown}
          />
          <ToolbarAction
            label="Descargar CSV"
            icon={DownloadIcon}
            onClick={onDownload}
          />
          <CopyAction
            label="Copiar enlace a esta vista"
            copiedLabel="Enlace copiado"
            icon={LinkIcon}
            text={viewLink}
          />
          {fullscreen ? (
            <ToolbarAction
              label="Cerrar pantalla completa"
              icon={CloseIcon}
              onClick={onFullscreen}
            />
          ) : (
            <ToolbarAction
              label="Pantalla completa"
              icon={FullscreenIcon}
              onClick={onFullscreen}
            />
          )}
        </div>
      </div>
      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <Button
              key={chipKey(chip)}
              type="button"
              variant="outline"
              size="xs"
              aria-label={`Quitar ${chip.label}`}
              onClick={() => onRemoveChip(chip)}
              className="max-w-full"
            >
              <span className="truncate">{chip.label}</span>
              <CloseIcon />
            </Button>
          ))}
          <Button
            type="button"
            variant="link"
            size="xs"
            onClick={onClearFilters}
          >
            Quitar filtros
          </Button>
        </div>
      ) : null}
    </div>
  )
}
