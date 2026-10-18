import type { Element, Properties } from "hast"
import { textWidth } from "#diagrams/measure"
import { type Graphic, TEXT_ROLES } from "#diagrams/model"
import { labelLeft } from "#diagrams/svg/edges"
import { cls, element, hued, n, P, rect, text } from "#diagrams/svg/elements"

// The shapes a typed form draws, as its layout gives them.

/**
 * A shape of a typed form, painted by its classes and hue; a data mark
 * carries what the reader's highlighting reads, a linked one is a link.
 */
export function graphicOf(
  graphic: Graphic,
  routeOf: (pagePath: string) => string
): Element {
  const className = [...cls(...graphic.classes), ...hued(graphic.hue)]
  const data: Properties = {}
  if (graphic.opacity !== null) data.fillOpacity = n(graphic.opacity)
  if (graphic.datum !== null) {
    className.push(`${P}mark`)
    data.dataNode = graphic.datum.id
    data.dataLabel = graphic.datum.label
    data.dataValue = graphic.datum.value
    if (graphic.datum.series !== null) data.dataSeries = graphic.datum.series
    if (graphic.datum.info !== null) data.dataInfo = graphic.datum.info
  }
  const shape = shapeOf(graphic, className, data)
  if (graphic.link === null) return shape
  return element(
    "a",
    { className: [`${P}link`], href: routeOf(graphic.link) },
    [shape]
  )
}

function shapeOf(
  graphic: Graphic,
  className: string[],
  data: Properties
): Element {
  if (graphic.kind === "rect")
    return rect(
      className,
      graphic.x,
      graphic.y,
      graphic.w,
      graphic.h,
      graphic.r,
      data
    )
  if (graphic.kind === "circle")
    return element("circle", {
      className,
      ...data,
      cx: n(graphic.cx),
      cy: n(graphic.cy),
      r: n(graphic.r),
    })
  if (graphic.kind === "path")
    return element("path", { className, ...data, d: graphic.d })
  if (graphic.kind === "polygon")
    return element("polygon", {
      className,
      ...data,
      points: graphic.points.map(([x, y]) => `${n(x)},${n(y)}`).join(" "),
    })
  if (graphic.kind === "line")
    return element("path", {
      className,
      ...data,
      d: `M${n(graphic.x1)} ${n(graphic.y1)} L${n(graphic.x2)} ${n(graphic.y2)}`,
    })
  const label = element(
    "text",
    {
      className: [...cls(graphic.role), ...className],
      ...data,
      x: n(graphic.x),
      y: n(graphic.y),
      textAnchor: graphic.anchor,
    },
    [text(graphic.text)]
  )
  if (!graphic.mask) return label
  const face = TEXT_ROLES[graphic.role]
  const width = Math.ceil(
    textWidth(graphic.text, face.size, face.font, face.tracking) + 8
  )
  return element("g", {}, [
    rect(
      cls("mask"),
      labelLeft(graphic.x, width, graphic.anchor),
      graphic.y - face.size - 1,
      width,
      face.size + 4,
      2
    ),
    label,
  ])
}

export function swatchOpacity(opacity: number | undefined): Properties {
  if (opacity === undefined) return {}
  return { fillOpacity: n(opacity) }
}
