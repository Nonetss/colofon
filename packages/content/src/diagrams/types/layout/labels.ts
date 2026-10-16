import { textWidth } from "#diagrams/measure"
import { TEXT_ROLES, type TextRole } from "#diagrams/model"
import type { Anchor } from "#diagrams/schema"

// Labels that must not overlap (timeline, quadrant, scatter): each label
// tries its candidate positions in order and takes the first that overlaps
// nothing placed before it nor any obstacle; one that finds none is left
// out, and its caller reports it.

export type Box = { x: number; y: number; w: number; h: number }

/** A candidate: where the text's baseline starts and how it is anchored. */
export type Spot = { x: number; y: number; anchor: Anchor }

/** The box a text covers at `spot`, in `role`'s face. */
export function textBox(text: string, role: TextRole, spot: Spot): Box {
  const face = TEXT_ROLES[role]
  const w = textWidth(text, face.size, face.font, face.tracking) + 4
  const h = face.size + 4
  const top = spot.y - face.size - 1
  if (spot.anchor === "middle") return { x: spot.x - w / 2, y: top, w, h }
  if (spot.anchor === "end") return { x: spot.x - w, y: top, w, h }
  return { x: spot.x, y: top, w, h }
}

export function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
  )
}

/**
 * The spot each label takes, in order, or `null` for a label none of whose
 * candidates is free. Placed labels become obstacles for the next ones.
 */
export function placeLabels(
  labels: readonly { text: string; role: TextRole; spots: readonly Spot[] }[],
  obstacles: readonly Box[] = []
): (Spot | null)[] {
  const taken: Box[] = [...obstacles]
  return labels.map((label) => {
    for (const spot of label.spots) {
      const box = textBox(label.text, label.role, spot)
      if (taken.some((other) => overlaps(box, other))) continue
      taken.push(box)
      return spot
    }
    return null
  })
}
