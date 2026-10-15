// What a column of a documentation table holds, guessed from its cells, so it
// sorts the way a person reads it: IPs by each number, sizes by bytes, dates
// by day, versions by each part. Ported from the earlier documentation site.

export type ColumnKind = "ip" | "date" | "size" | "version" | "number" | "text"

/** What a cell sorts by; `null` is an empty cell, always last. */
export type SortKey = number | number[] | string | null

/** Cells that say nothing: they sort last whatever the direction. */
const EMPTY = /^(?:|—|–|-|n\/a|\?)$/i

export function isEmptyCell(text: string): boolean {
  return EMPTY.test(text.trim())
}

const IP =
  /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2})|:(\d{1,5}))?\b/
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/
const ES_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\b/
const SIZE = /^[~≈]?\s*(\d+(?:[.,]\d+)?)\s*(B|[KMGTP]i?B|[KMGTP])\b/i
const VERSION = /^v?(\d+(?:\.\d+){2,})|^v(\d+(?:\.\d+)*)/i
const NUMBER =
  /^[~≈]?\s*(-?\d{1,3}(?:\.\d{3})+(?:,\d+)?|-?\d+(?:[.,]\d+)?)\s*%?$/
const THOUSANDS = /^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/

const UNITS = "BKMGTP"

/** `1.234,5` and `1234.5` → 1234.5; `1,5` → 1.5. */
function toNumber(text: string): number {
  if (THOUSANDS.test(text))
    return Number(text.replaceAll(".", "").replace(",", "."))
  return Number(text.replace(",", "."))
}

function groupNumbers(
  match: RegExpExecArray,
  groups: readonly number[],
  missing: number
): number[] {
  return groups.map((group) => {
    const value = match[group]
    if (value === undefined) return missing
    return Number(value)
  })
}

function ipKey(text: string): SortKey {
  const match = IP.exec(text)
  if (match === null) return null
  return groupNumbers(match, [1, 2, 3, 4, 5, 6], -1)
}

function dateKey(text: string): SortKey {
  const iso = ISO_DATE.exec(text)
  if (iso !== null) return groupNumbers(iso, [1, 2, 3, 4, 5], 0)
  const es = ES_DATE.exec(text)
  if (es === null) return null
  return [...groupNumbers(es, [3, 2, 1], 0), 0, 0]
}

/** KB and KiB alike: the docs mix them and nobody minds the 2 %. */
function unitPower(unit: string): number {
  const first = unit.toUpperCase().charAt(0)
  return Math.max(UNITS.indexOf(first), 0)
}

function sizeKey(text: string): SortKey {
  const match = SIZE.exec(text)
  const amount = match?.[1]
  const unit = match?.[2]
  if (amount === undefined || unit === undefined) return null
  return toNumber(amount) * 1024 ** unitPower(unit)
}

function versionText(match: RegExpExecArray | null): string | undefined {
  if (match === null) return undefined
  if (match[1] !== undefined) return match[1]
  return match[2]
}

function versionKey(text: string): SortKey {
  const version = versionText(VERSION.exec(text))
  if (version === undefined) return null
  return version.split(".").map(Number)
}

function numberKey(text: string): SortKey {
  const value = NUMBER.exec(text)?.[1]
  if (value === undefined) return null
  return toNumber(value)
}

const KEYS: Record<Exclude<ColumnKind, "text">, (text: string) => SortKey> = {
  ip: ipKey,
  date: dateKey,
  size: sizeKey,
  version: versionKey,
  number: numberKey,
}

/** Most specific first: a plain `3` is a number, not a version. */
const KIND_ORDER = ["ip", "date", "size", "version", "number"] as const

/** The share of non-empty cells that must read as a kind for the column. */
const KIND_SHARE = 0.9

/**
 * The kind of a column: the first that reads at least 90 % of its non-empty
 * cells, so a stray note doesn't turn a column of IPs into text. A column
 * with no values is text.
 */
export function detectKind(texts: readonly string[]): ColumnKind {
  const values = texts
    .map((text) => text.trim())
    .filter((text) => !isEmptyCell(text))
  if (values.length === 0) return "text"
  for (const kind of KIND_ORDER) {
    const read = values.filter((value) => KEYS[kind](value) !== null).length
    if (read >= values.length * KIND_SHARE) return kind
  }
  return "text"
}

/**
 * What a cell sorts by in a column of that kind. Text is kept as it is; a
 * cell that doesn't read as the column's kind sorts as text, after the ones
 * that do.
 */
export function sortKey(kind: ColumnKind, text: string): SortKey {
  const value = text.trim()
  if (isEmptyCell(value)) return null
  if (kind === "text") return value
  const key = KEYS[kind](value)
  if (key === null) return value
  return key
}

const collator = new Intl.Collator("es", {
  numeric: true,
  sensitivity: "base",
})

function asList(key: number | number[]): number[] {
  if (Array.isArray(key)) return key
  return [key]
}

function compareLists(a: readonly number[], b: readonly number[]): number {
  for (let at = 0; at < Math.max(a.length, b.length); at++) {
    const difference = (a[at] ?? -1) - (b[at] ?? -1)
    if (difference !== 0) return difference
  }
  return 0
}

/**
 * Compares two keys of the same column, ascending. Empty keys go last; a
 * key that read as the column's kind goes before one that didn't.
 */
export function compareKeys(a: SortKey, b: SortKey): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  if (typeof a === "string" && typeof b === "string")
    return collator.compare(a, b)
  if (typeof a === "string") return 1
  if (typeof b === "string") return -1
  if (typeof a === "number" && typeof b === "number") return a - b
  return compareLists(asList(a), asList(b))
}
