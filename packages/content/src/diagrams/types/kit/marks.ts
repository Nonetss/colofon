import type { Datum, Graphic } from "#diagrams/model"
import type { Item } from "#diagrams/types/kit/items"

// The data marks every typed form draws: an id each, the identity the
// reader's card shows (`Datum`), and the coordinates rounded as the SVG
// writes them.

/** Hands out the drawing's mark ids: `m0`, `m1`… */
export function markIds(): () => string {
  let next = 0
  return () => {
    const id = `m${next}`
    next += 1
    return id
  }
}

/** A data mark's identity. */
export function datumOf(
  id: string,
  label: string,
  series: string | null,
  value: string,
  info: string | null = null
): Datum {
  return { id, label, series, value, info }
}

/** A datum for an item: its name, the value shown and its `info`. */
export function itemDatum(
  id: string,
  item: Item,
  value: string,
  series: string | null = null
): Datum {
  return { id, label: item.name, series, value, info: item.info }
}

/** `graphic` as a data mark. */
export function withDatum(graphic: Graphic, datum: Datum): Graphic {
  return { ...graphic, datum }
}

/** `graphic` linking to `link`, when there is one. */
export function withLink(graphic: Graphic, link: string | null): Graphic {
  return { ...graphic, link }
}

/** A coordinate rounded to a tenth of a pixel. */
export function tenth(value: number): number {
  return Math.round(value * 10) / 10
}

/** A coordinate as an SVG attribute writes it, to a tenth of a pixel. */
export function tenthText(value: number): string {
  return String(tenth(value))
}
