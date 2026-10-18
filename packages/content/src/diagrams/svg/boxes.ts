import type { Element, Properties } from "hast"
import { badgeWidth, tagWidth } from "#diagrams/measure"
import type {
  BoxShape,
  DiagramBox,
  DiagramEdge,
  DiagramRow,
} from "#diagrams/model"
import type { NodeKind } from "#diagrams/schema"
import {
  cls,
  element,
  hair,
  hued,
  n,
  P,
  rect,
  textAt,
} from "#diagrams/svg/elements"

// The boxes of a drawn diagram: plain, shaped or a table, with their tag
// and the badges that stand for far connections.

/**
 * A box, wrapped with what the reader's highlighting reads: its id, zone,
 * `trace`, `needs` and `info`; a link to its page when it has one.
 */
export function boxOf(
  box: DiagramBox,
  routeOf: (pagePath: string) => string
): Element {
  const body = box.rows === null ? plainBox(box) : tableBox(box, box.rows)
  const data: Properties = {}
  if (box.id !== null) data.dataNode = box.id
  if (box.zone !== null) data.dataZone = box.zone
  if (box.trace) data.dataTrace = "true"
  if (box.needs.length > 0) data.dataNeeds = box.needs.join(" ")
  if (box.info !== null) data.dataInfo = box.info
  if (box.link === null)
    return element(
      "g",
      { className: [`${P}box`, ...hued(box.hue)], ...data },
      body
    )
  return element(
    "a",
    {
      className: [`${P}box`, `${P}link`, ...hued(box.hue)],
      href: routeOf(box.link),
      ...data,
    },
    body
  )
}

/** A rounded box, or the outline its shape names. */
export function outline(
  className: string[],
  x: number,
  y: number,
  w: number,
  h: number,
  shape: BoxShape | null,
  rim: boolean
): Element[] {
  if (shape === "pill") return [rect(className, x, y, w, h, h / 2)]
  if (shape === "rounded") return [rect(className, x, y, w, h, h / 3)]
  if (shape === "diamond")
    return [
      element("path", {
        className,
        d: `M${n(x + w / 2)} ${n(y)} L${n(x + w)} ${n(y + h / 2)} L${n(x + w / 2)} ${n(y + h)} L${n(x)} ${n(y + h / 2)} Z`,
      }),
    ]
  if (shape === "parallelogram") {
    const slant = Math.min(16, w / 6)
    return [
      element("path", {
        className,
        d: `M${n(x + slant)} ${n(y)} H${n(x + w)} L${n(x + w - slant)} ${n(y + h)} H${n(x)} Z`,
      }),
    ]
  }
  if (shape === "circle")
    return [
      element("circle", {
        className,
        cx: n(x + w / 2),
        cy: n(y + h / 2),
        r: n(Math.min(w, h) / 2),
      }),
    ]
  if (shape === "cylinder") {
    const r = Math.min(7, h / 4)
    const rx = w / 2
    const body = element("path", {
      className,
      d: `M${n(x)} ${n(y + r)} A${n(rx)} ${n(r)} 0 0 1 ${n(x + w)} ${n(y + r)} V${n(y + h - r)} A${n(rx)} ${n(r)} 0 0 1 ${n(x)} ${n(y + h - r)} Z`,
    })
    if (!rim) return [body]
    return [
      body,
      element("path", {
        className: [...className, `${P}rim`],
        d: `M${n(x)} ${n(y + r)} A${n(rx)} ${n(r)} 0 0 0 ${n(x + w)} ${n(y + r)}`,
      }),
    ]
  }
  return [rect(className, x, y, w, h, 6)]
}

export function nodeClasses(kind: NodeKind): string[] {
  return cls("node", kind)
}

/** A framed tag: its box and its text, in capitals. */
function tagOf(tag: string, kind: NodeKind, x: number, y: number): Element[] {
  const width = tagWidth(tag)
  const focal = kind === "focal"
  const box = cls("tagbox")
  const label = cls("tag")
  if (focal) {
    box.push(`${P}tagbox-focal`)
    label.push(`${P}tag-focal`)
  }
  return [
    rect(box, x, y, width, 12, 2),
    textAt(label, x + width / 2, y + 9, tag.toUpperCase(), "middle"),
  ]
}

/** Where a box's tag sits: on its top row, or over the name inside a shape that narrows. */
function tagTop(box: DiagramBox, nameY: number): number {
  if (box.shape === "cylinder") return box.y + 16
  if (box.shape === "diamond" || box.shape === "circle") return nameY - 26
  return box.y + 6
}

function plainBox(box: DiagramBox): Element[] {
  const { x, y, w, h, shape } = box
  const cx = x + w / 2
  const cylinder = shape === "cylinder"
  const tagRow = box.tag === null ? 0 : 18
  const cylinderTop = cylinder ? 8 : 0
  const top = tagRow + cylinderTop
  const block = 12 + 15 * box.sub.length
  const nameY = y + top + (h - top - block) / 2 + 10
  const parts: Element[] = [
    ...outline(cls("paper"), x, y, w, h, shape, false),
    ...outline(nodeClasses(box.kind), x, y, w, h, shape, true),
  ]
  if (box.tag !== null) {
    // Centred on any shape, at the left on a box.
    const tx = shape === null ? x + 8 : cx - tagWidth(box.tag) / 2
    parts.push(...tagOf(box.tag, box.kind, tx, tagTop(box, nameY)))
  }
  parts.push(textAt(cls("name"), cx, nameY, box.name, "middle"))
  box.sub.forEach((line, index) => {
    parts.push(textAt(cls("sub"), cx, nameY + 15 * (index + 1), line, "middle"))
  })
  return parts
}

/**
 * A database table: name on top, a hairline, then one row per column with
 * its key, name and type, and its "more" line.
 */
function tableBox(box: DiagramBox, rows: readonly DiagramRow[]): Element[] {
  const { x, y, w, h } = box
  const parts: Element[] = [
    rect(cls("paper"), x, y, w, h, 6),
    rect(nodeClasses(box.kind), x, y, w, h, 6),
    textAt(cls("table-name"), x + 12, y + 20, box.name),
    hair(x, x + w, y + 30),
  ]
  if (box.tag !== null)
    parts.push(
      ...tagOf(box.tag, box.kind, x + w - 8 - tagWidth(box.tag), y + 9)
    )
  rows.forEach((row, index) => {
    const ry = y + 46 + 14 * index
    if (row.key !== null) {
      const key = cls("key")
      if (row.key === "PK") key.push(`${P}key-pk`)
      parts.push(textAt(key, x + 12, ry, row.key))
    }
    parts.push(textAt(cls("col"), x + 40, ry, row.name))
    if (row.type !== null)
      parts.push(textAt(cls("type"), x + w - 12, ry, row.type, "end"))
  })
  const moreRow = box.more === null ? 0 : 14
  if (box.more !== null)
    parts.push(textAt(cls("more"), x + 12, y + 46 + 14 * rows.length, box.more))
  if (box.ops !== null && box.ops.length > 0) {
    const top = y + 36 + 14 * rows.length + moreRow
    parts.push(hair(x, x + w, top))
    box.ops.forEach((op, index) => {
      const ry = top + 20 + 14 * index
      if (op.key !== null) parts.push(textAt(cls("key"), x + 12, ry, op.key))
      parts.push(textAt(cls("col"), x + 40, ry, op.name))
      if (op.type !== null)
        parts.push(textAt(cls("type"), x + w - 12, ry, op.type, "end"))
    })
  }
  return parts
}

/**
 * The chips of the badge arrows that leave `box`: a pill each, in the hue
 * of the box they go to, from its top right corner leftwards.
 */
export function badgesOf(
  box: DiagramBox,
  edges: readonly DiagramEdge[],
  byId: ReadonlyMap<string, DiagramBox>
): Element[] {
  if (box.id === null) return []
  let right = box.x + box.w - 8
  const chips: Element[] = []
  for (const edge of edges) {
    if (edge.badge === null || edge.from !== box.id || edge.to === null)
      continue
    const width = badgeWidth(edge.badge)
    const left = right - width
    const hue = byId.get(edge.to)?.hue ?? null
    const data: Properties = {
      dataEdge: String(edge.index),
      dataFrom: edge.from,
      dataTo: edge.to,
      dataLabel: chipLabel(edge, edge.badge),
    }
    if (edge.info !== null) data.dataInfo = edge.info
    chips.push(
      element("g", { className: [`${P}badge`, ...hued(hue)], ...data }, [
        rect([`${P}badge-box`, ...hued(hue)], left, box.y + 6, width, 12, 6),
        textAt(
          [`${P}badge-t`, ...hued(hue)],
          left + width / 2,
          box.y + 15,
          edge.badge,
          "middle"
        ),
      ])
    )
    right = left - 3
  }
  return chips
}

function chipLabel(edge: DiagramEdge, badge: string): string {
  if (edge.label !== null) return edge.label
  return badge
}
