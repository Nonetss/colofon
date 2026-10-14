import { getIcon } from "@/lib/icon-registry"

const ChevronDown = getIcon("controls", "expand")
const ChevronRight = getIcon("controls", "chevronRight")

import { type CSSProperties, useId, useMemo, useState } from "react"
import { Text } from "@/components/shared/brand/typography"
import { SearchInput } from "@/components/shared/form/search-input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  buildRootNameTree,
  checkStateOf,
  matchingTree,
  namesUnder,
  type RootNameGroup,
  type RootNameLeaf,
  type RootNameNode,
  toggleNames,
} from "@/features/admin/traces/overview/model/root-name-tree"
import { foldText } from "@/lib/fold-text"
import { cn } from "@/lib/utils"

interface TreeState {
  /** Prefixes this filter's checkbox ids. */
  idPrefix: string
  selected: ReadonlySet<string>
  /** Every segment shows its contents (while searching). */
  expandAll: boolean
  expanded: ReadonlySet<string>
  onToggleExpanded: (path: string) => void
  onToggleNames: (names: readonly string[]) => void
}

/** A checkbox id from a name or path: whitespace can't be in an id, so the
 *  key is URI-encoded. */
function controlId(state: TreeState, kind: "name" | "path", key: string) {
  return `${state.idPrefix}-${kind}-${encodeURIComponent(key)}`
}

/** Rows step in by depth; the root's own rows sit at the left edge. */
function indentOf(depth: number): CSSProperties {
  return { paddingInlineStart: `${0.5 + depth * 1}rem` }
}

function emptyTextOf(groups: readonly RootNameGroup[]): string {
  if (groups.length === 0) return "No hay trazas en este periodo."
  return "Ninguna traza coincide."
}

/** What a group's checkbox and expand button are named after: the
 *  service, or the path under it. */
function accessibleNameOf(node: RootNameNode): string {
  if (node.kind === "service") return node.label
  return node.path.slice(node.path.indexOf(":") + 1).trim()
}

function triggerLabelOf(count: number): string {
  if (count === 0) return "Todas las trazas"
  if (count === 1) return "1 traza"
  return `${count} trazas`
}

function LeafRow({
  leaf,
  label,
  tag,
  depth,
  state,
}: {
  leaf: RootNameLeaf
  label: string
  /** The method, beside a segment that holds one name. */
  tag?: string
  depth: number
  state: TreeState
}) {
  const id = controlId(state, "name", leaf.name)
  return (
    <li
      style={indentOf(depth)}
      className="flex items-center gap-2 rounded-sm py-1.5 pr-2 hover:bg-accent"
    >
      {/* Lines up with the segments' expand buttons. */}
      <span aria-hidden className="size-5 shrink-0" />
      <Checkbox
        id={id}
        checked={state.selected.has(leaf.name)}
        onCheckedChange={() => state.onToggleNames([leaf.name])}
        aria-label={leaf.name}
      />
      <label
        htmlFor={id}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2"
      >
        <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
        {tag ? (
          <Text as="span" variant="status" tone="muted">
            {tag}
          </Text>
        ) : null}
      </label>
    </li>
  )
}

function NodeRows({
  node,
  depth,
  state,
}: {
  node: RootNameNode
  depth: number
  state: TreeState
}) {
  const label = node.label
  const onlyLeaf = node.leaves[0]
  // A segment holding a single name and nothing deeper is that name; a
  // service always stays a group, so every service reads the same way.
  if (
    node.kind === "segment" &&
    node.children.length === 0 &&
    node.leaves.length === 1 &&
    onlyLeaf !== undefined
  ) {
    return (
      <LeafRow
        leaf={onlyLeaf}
        label={label}
        tag={onlyLeaf.label}
        depth={depth}
        state={state}
      />
    )
  }

  const names = namesUnder(node)
  const check = checkStateOf(names, state.selected)
  const open = state.expandAll || state.expanded.has(node.path)
  const Chevron = open ? ChevronDown : ChevronRight
  const expandAction = open ? "Plegar" : "Desplegar"
  const id = controlId(state, "path", node.path)
  return (
    <li>
      <div
        style={indentOf(depth)}
        className="flex items-center gap-2 rounded-sm py-1 pr-2 hover:bg-accent"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-5 shrink-0"
          aria-expanded={open}
          aria-label={`${expandAction} ${accessibleNameOf(node)}`}
          onClick={() => state.onToggleExpanded(node.path)}
          disabled={state.expandAll}
        >
          <Chevron className="size-3.5" />
        </Button>
        <Checkbox
          id={id}
          checked={check === "checked"}
          indeterminate={check === "partial"}
          onCheckedChange={() => state.onToggleNames(names)}
          aria-label={`Todas las trazas de ${accessibleNameOf(node)}`}
        />
        <label
          htmlFor={id}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-0.5"
        >
          <span className="min-w-0 flex-1 truncate font-medium text-sm">
            {label}
          </span>
          <Text
            as="span"
            variant="compact"
            tone="muted"
            className="tabular-nums"
          >
            {names.length}
          </Text>
        </label>
      </div>
      {open ? (
        <ul className="grid gap-0.5">
          <TreeRows node={node} depth={depth + 1} state={state} />
        </ul>
      ) : null}
    </li>
  )
}

/** A node's contents: its deeper segments, then its own names. */
function TreeRows({
  node,
  depth,
  state,
}: {
  node: RootNameNode
  depth: number
  state: TreeState
}) {
  return (
    <>
      {node.children.map((child) => (
        <NodeRows key={child.path} node={child} depth={depth} state={state} />
      ))}
      {node.leaves.map((leaf) => (
        <LeafRow
          key={leaf.name}
          leaf={leaf}
          label={leaf.label}
          depth={depth}
          state={state}
        />
      ))}
    </>
  )
}

/**
 * The trace list's root span name filter: the names Tempo saw, grouped by
 * the service that started the trace (Frontend, Backend, Worker…) and, under
 * each, nested by path segment (`/rpc` → `v1` → `cron` → `list`). Ticking a
 * service or a segment keeps every name under it; nothing ticked keeps every
 * trace.
 */
export function TraceNameFilter({
  groups,
  selected,
  onChange,
}: {
  groups: readonly RootNameGroup[]
  selected: readonly string[]
  onChange: (next: string[]) => void
}) {
  const idPrefix = useId()
  const [query, setQuery] = useState("")
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const tree = useMemo(() => buildRootNameTree(groups), [groups])
  const folded = foldText(query.trim())
  const visible = useMemo(() => matchingTree(tree, folded), [tree, folded])
  const selectedSet = useMemo(() => new Set(selected), [selected])

  const state: TreeState = {
    idPrefix,
    selected: selectedSet,
    expandAll: folded !== "",
    expanded,
    onToggleExpanded: (path) => {
      setExpanded((current) => {
        const next = new Set(current)
        if (next.has(path)) next.delete(path)
        else next.add(path)
        return next
      })
    },
    onToggleNames: (group) => onChange(toggleNames(selected, group)),
  }
  const active = selected.length > 0

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Filtrar por traza: ${triggerLabelOf(selected.length)}`}
            className={cn(
              "h-9 w-full justify-between gap-2",
              active && "border-primary/40 text-primary"
            )}
          />
        }
      >
        <span className="truncate">{triggerLabelOf(selected.length)}</span>
        <ChevronDown className="size-4 opacity-60" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--anchor-width) min-w-72 p-2">
        <SearchInput
          value={query}
          onValueChange={setQuery}
          placeholder="Buscar traza…"
          label="Buscar trazas por nombre"
        />
        <div className="mt-2 max-h-80 overflow-y-auto">
          {visible === null ? (
            <Text as="p" variant="compact" tone="muted" className="px-2 py-3">
              {emptyTextOf(groups)}
            </Text>
          ) : (
            <ul aria-label="Trazas" className="grid gap-0.5">
              <TreeRows node={visible} depth={0} state={state} />
            </ul>
          )}
        </div>
        {active ? (
          <div className="mt-2 border-t pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange([])}
            >
              Quitar filtro
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
