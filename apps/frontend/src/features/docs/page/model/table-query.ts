import { foldText } from "@/lib/fold-text"

// What is typed in a table's filter box: words that must all be found in a
// row, accents and case aside. `name:value` looks only in the column whose
// header is `name`, or the only one that starts with it.

/** A word of the box: free, or only for one column (`kind:vm`). */
export interface QueryTerm {
  /** Index of the column, or `null` for every visible column. */
  column: number | null
  value: string
}

/** The folded words of `query`. */
export function queryWords(query: string): string[] {
  return foldText(query).split(/\s+/).filter(Boolean)
}

/** The column `name` names: the exact header, or the only one it prefixes. */
function columnNamed(name: string, headers: readonly string[]): number | null {
  const exact = headers.indexOf(name)
  if (exact >= 0) return exact
  const prefixed: number[] = []
  headers.forEach((header, index) => {
    if (header.startsWith(name)) prefixed.push(index)
  })
  const [only] = prefixed
  if (prefixed.length !== 1 || only === undefined) return null
  return only
}

/**
 * The terms of a box. A `name:value` word whose `name` fits no column, or
 * several, is looked up in every column as typed; `name:` alone is dropped.
 */
export function tableTerms(
  query: string,
  headers: readonly string[]
): QueryTerm[] {
  const folded = headers.map(foldText)
  const terms: QueryTerm[] = []
  for (const word of queryWords(query)) {
    const at = word.indexOf(":")
    if (at <= 0) {
      terms.push({ column: null, value: word })
      continue
    }
    const column = columnNamed(word.slice(0, at), folded)
    const value = word.slice(at + 1)
    if (column === null) terms.push({ column: null, value: word })
    else if (value !== "") terms.push({ column, value })
  }
  return terms
}

/**
 * Whether a row matches every term: `cells` are its folded cell texts and
 * `visible` the indexes of the columns shown.
 */
export function rowMatches(
  terms: readonly QueryTerm[],
  cells: readonly string[],
  visible: readonly number[]
): boolean {
  return terms.every((term) => {
    if (term.column === null)
      return visible.some((index) => cells[index]?.includes(term.value))
    return cells[term.column]?.includes(term.value) ?? false
  })
}
