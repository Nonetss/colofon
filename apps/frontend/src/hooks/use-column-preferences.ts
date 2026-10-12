import { useCallback, useEffect, useRef, useState } from "react"

/** What a table declares about one column for its saved layout. The array
 *  order of the declarations is the default column order. */
export type ColumnPreferenceDefault = {
  id: string
  size: number
  minSize: number
  maxSize: number
  /** `false` keeps the column at its declared `size` whatever was saved. */
  resizable: boolean
  /** `false` keeps the column shown whatever was saved. */
  hideable: boolean
  /** Shown when nothing was saved and after a reset; ignored (always shown)
   *  for a non-hideable column. */
  visible: boolean
  /** `false` pins the column to its default index. */
  reorderable: boolean
}

export type ColumnPreferences = {
  visibility: Record<string, boolean>
  order: string[]
  sizing: Record<string, number>
}

type Updater<T> = T | ((previous: T) => T)

const STORAGE_VERSION = 1
const WRITE_DELAY_MS = 250

export function columnPreferencesStorageKey(tableId: string): string {
  return `nonete:table-columns:${tableId}`
}

export function defaultColumnPreferences(
  columns: readonly ColumnPreferenceDefault[]
): ColumnPreferences {
  const visibility: Record<string, boolean> = {}
  const sizing: Record<string, number> = {}
  for (const column of columns) {
    visibility[column.id] = !column.hideable || column.visible
    sizing[column.id] = column.size
  }
  return { visibility, order: columns.map((column) => column.id), sizing }
}

function clamp(value: number, column: ColumnPreferenceDefault): number {
  return Math.min(column.maxSize, Math.max(column.minSize, value))
}

/** The width to keep for `size`: a resizable column's within its limits, a
 *  fixed column's always its declared one. */
function widthOf(size: unknown, column: ColumnPreferenceDefault): number {
  if (!column.resizable) return column.size
  if (typeof size !== "number" || !Number.isFinite(size)) return column.size
  return clamp(size, column)
}

/**
 * Puts every declared column exactly once into `order`: unknown and repeated
 * ids are dropped, a column missing from `order` goes right after its nearest
 * preceding column in the default order, and a non-reorderable column is
 * moved back to its default index.
 */
export function normalizeColumnOrder(
  order: readonly string[],
  columns: readonly ColumnPreferenceDefault[]
): string[] {
  const known = new Set(columns.map((column) => column.id))
  const merged: string[] = []
  for (const id of order) {
    if (known.has(id) && !merged.includes(id)) merged.push(id)
  }

  columns.forEach((column, index) => {
    if (merged.includes(column.id)) return
    let insertAt = 0
    for (let previous = index - 1; previous >= 0; previous -= 1) {
      const neighbour = columns[previous]
      if (!neighbour) continue
      const at = merged.indexOf(neighbour.id)
      if (at !== -1) {
        insertAt = at + 1
        break
      }
    }
    merged.splice(insertAt, 0, column.id)
  })

  const movable = merged.filter((id) =>
    columns.some((column) => column.id === id && column.reorderable)
  )
  return columns.map((column) => {
    if (!column.reorderable) return column.id
    const next = movable.shift()
    if (next === undefined) return column.id
    return next
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Reads a table's saved layout against its current columns. Anything it
 * can't trust falls back to the column's default: unknown ids are dropped,
 * new columns appear at their default position, widths are clamped to the
 * current limits (a non-resizable column keeps its declared width), and
 * malformed or other-version data yields the defaults.
 */
export function parseColumnPreferences(
  raw: string | null,
  columns: readonly ColumnPreferenceDefault[]
): ColumnPreferences {
  const defaults = defaultColumnPreferences(columns)
  if (raw === null) return defaults

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return defaults
  }
  if (!isRecord(parsed) || parsed.v !== STORAGE_VERSION) return defaults

  const visibility = { ...defaults.visibility }
  const sizing = { ...defaults.sizing }
  const savedVisibility = parsed.visibility
  const savedSizing = parsed.sizing

  for (const column of columns) {
    if (isRecord(savedVisibility) && column.hideable) {
      const visible = savedVisibility[column.id]
      if (typeof visible === "boolean") visibility[column.id] = visible
    }
    if (isRecord(savedSizing)) {
      sizing[column.id] = widthOf(savedSizing[column.id], column)
    }
  }

  const savedOrder = parsed.order
  const order = Array.isArray(savedOrder)
    ? normalizeColumnOrder(
        savedOrder.filter((id): id is string => typeof id === "string"),
        columns
      )
    : defaults.order

  return { visibility, order, sizing }
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, preferences: ColumnPreferences): void {
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({ v: STORAGE_VERSION, ...preferences })
    )
  } catch {
    // Private mode or blocked site data: the layout lives for this visit.
  }
}

function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Same as above.
  }
}

/** The state slices here are records and arrays, never functions, so a
 *  function argument is always the updater form. */
function isUpdaterFunction<T>(
  updater: Updater<T>
): updater is (previous: T) => T {
  return typeof updater === "function"
}

function resolve<T>(updater: Updater<T>, previous: T): T {
  if (isUpdaterFunction(updater)) return updater(previous)
  return updater
}

/**
 * A table's column visibility, order and widths, remembered per browser in
 * `localStorage` under `nonete:table-columns:<tableId>`. The setters take a
 * value or an updater, like TanStack Table's `on<State>Change`, so they can
 * be passed straight to it. Writes are debounced, so dragging a resize
 * handle writes once when it settles.
 */
export function useColumnPreferences(
  tableId: string,
  columns: readonly ColumnPreferenceDefault[]
) {
  const storageKey = columnPreferencesStorageKey(tableId)
  const [preferences, setPreferences] = useState(() =>
    parseColumnPreferences(readStorage(storageKey), columns)
  )
  const dirty = useRef(false)
  const latest = useRef(preferences)
  latest.current = preferences

  useEffect(() => {
    if (!dirty.current) return
    const timer = window.setTimeout(() => {
      writeStorage(storageKey, preferences)
      dirty.current = false
    }, WRITE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [storageKey, preferences])

  // A change still waiting for its debounced write is saved on unmount.
  useEffect(
    () => () => {
      if (dirty.current) writeStorage(storageKey, latest.current)
    },
    [storageKey]
  )

  const setVisibility = useCallback(
    (updater: Updater<Record<string, boolean>>) => {
      dirty.current = true
      setPreferences((previous) => {
        const next = resolve(updater, previous.visibility)
        const visibility = { ...next }
        for (const column of columns) {
          if (!column.hideable) visibility[column.id] = true
        }
        return { ...previous, visibility }
      })
    },
    [columns]
  )

  const setOrder = useCallback(
    (updater: Updater<string[]>) => {
      dirty.current = true
      setPreferences((previous) => ({
        ...previous,
        order: normalizeColumnOrder(resolve(updater, previous.order), columns),
      }))
    },
    [columns]
  )

  const setSizing = useCallback(
    (updater: Updater<Record<string, number>>) => {
      dirty.current = true
      setPreferences((previous) => {
        // A column the next state leaves out (TanStack's `resetSize`, or
        // `resetColumnSizing` passing `{}`) goes back to its default width.
        const next = resolve(updater, previous.sizing)
        const sizing: Record<string, number> = {}
        for (const column of columns) {
          sizing[column.id] = widthOf(next[column.id], column)
        }
        return { ...previous, sizing }
      })
    },
    [columns]
  )

  const reset = useCallback(() => {
    dirty.current = false
    removeStorage(storageKey)
    setPreferences(defaultColumnPreferences(columns))
  }, [storageKey, columns])

  return { ...preferences, setVisibility, setOrder, setSizing, reset }
}
