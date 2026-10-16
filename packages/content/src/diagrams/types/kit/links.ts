import { z } from "zod"
import type { DiagramBox, DiagramEdge, Point, TextPart } from "#diagrams/model"
import type { Report } from "#diagrams/report"
import { EDGE_KINDS, type EdgeKind, type Head } from "#diagrams/schema"
import type { Route } from "#diagrams/types/layout/grid-route"

// The links of the graph-like forms (flowchart, state, swimlane,
// dependency…): written as `{ from, to, label?, kind? }` between item ids,
// drawn as a drawn diagram's arrows, so the reader's highlighting and text
// version treat them as such.

const text = z.string().min(1)

/** The schema of a link between two items. */
export const linkSchema = z.strictObject({
  from: z.string().meta({ description: "El id de la parte de la que sale" }),
  to: z.string().meta({ description: "El id de la parte a la que llega" }),
  label: text.optional().meta({ description: "Lo que dice la flecha" }),
  kind: z.enum(EDGE_KINDS).optional().meta({
    description:
      "default; accent: el camino principal; dash: opcional o de vuelta",
  }),
  info: text.optional().meta({
    description: "Lo que dice la tarjeta al pasar por encima",
  }),
})

export type LinkWritten = z.infer<typeof linkSchema>

/** A link whose ends both exist. */
export type KnownLink = { at: string; written: LinkWritten }

/**
 * The links among `written` whose ends are known ids, the others reported
 * naming the missing end and left out.
 */
export function knownLinks(
  written: readonly { at: string; value: LinkWritten }[],
  ids: ReadonlySet<string>,
  report: Report
): KnownLink[] {
  const kept: KnownLink[] = []
  for (const { at, value } of written) {
    let ok = true
    for (const end of ["from", "to"] as const) {
      if (ids.has(value[end])) continue
      report(
        `${at}.${end}`,
        `\`${value[end]}\` no es ninguna de las partes del diagrama`
      )
      ok = false
    }
    if (ok) kept.push({ at, written: value })
  }
  return kept
}

/**
 * A link as an arrow: along `route`, or as a self-loop on its box when it
 * goes from a box to itself.
 */
export function linkEdge(
  index: number,
  link: LinkWritten,
  route: Route | null,
  boxes: ReadonlyMap<string, DiagramBox>,
  options: { kind?: EdgeKind; head?: Head; noHead?: boolean } = {}
): DiagramEdge | null {
  const base = {
    index,
    from: link.from,
    to: link.to,
    toZone: null,
    kind: kindOf(options.kind, link.kind),
    hue: null,
    info: link.info ?? null,
    noHead: options.noHead === true,
    head: options.head ?? "arrow",
    route: "orthogonal" as const,
    badge: null,
    label: link.label ?? null,
  }
  if (link.from === link.to) {
    const box = boxes.get(link.from)
    if (box === undefined) return null
    const loop = selfLoop(box)
    return { ...base, points: loop.points, at: loop.at, anchor: "start" }
  }
  if (route === null) return null
  return { ...base, points: route.points, at: route.at, anchor: route.anchor }
}

/** "<from> → <to>: <label>", with the ends as linked names. */
export function linkLine(link: LinkWritten): TextPart[] {
  const line: TextPart[] = [{ box: link.from }, " → ", { box: link.to }]
  if (link.label !== undefined) line.push(`: ${link.label}`)
  return line
}

/** The furthest right and down any of `points` reaches. */
export function extentOf(points: readonly Point[]): {
  right: number
  bottom: number
} {
  let right = 0
  let bottom = 0
  for (const [x, y] of points) {
    right = Math.max(right, x)
    bottom = Math.max(bottom, y)
  }
  return { right, bottom }
}

function kindOf(
  forced: EdgeKind | undefined,
  own: EdgeKind | undefined
): EdgeKind {
  if (forced !== undefined) return forced
  return own ?? "default"
}

/**
 * A loop over a box's top right corner: up from its top, right past its
 * side and back into it, with its label beside the loop.
 */
export function selfLoop(box: Pick<DiagramBox, "x" | "y" | "w" | "h">): {
  points: Point[]
  at: Point
} {
  const right = box.x + box.w
  const start = right - Math.min(24, box.w / 3)
  const end = box.y + Math.min(16, box.h / 3)
  return {
    points: [
      [start, box.y],
      [start, box.y - 20],
      [right + 20, box.y - 20],
      [right + 20, end],
      [right, end],
    ],
    at: [right + 26, box.y - 24],
  }
}
