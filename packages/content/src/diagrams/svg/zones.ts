import type { Element, Properties } from "hast"
import { textWidth } from "#diagrams/measure"
import type { DiagramZone } from "#diagrams/model"
import { cls, element, hued, rect, textAt } from "#diagrams/svg/elements"

// The zones of a drawn diagram: a hued frame and its title on a mask.

function zoneData(zone: DiagramZone): Properties {
  if (zone.id === null) return {}
  return { dataZone: zone.id }
}

export function zoneFrame(zone: DiagramZone): Element {
  return rect(
    [...cls("zone"), ...hued(zone.hue)],
    zone.x,
    zone.y,
    zone.w,
    zone.h,
    8,
    zoneData(zone)
  )
}

/** Its title on a mask, drawn over the arrows so no line crosses it. */
export function zoneTitle(zone: DiagramZone): Element {
  const width = Math.ceil(textWidth(zone.label, 8, "mono", 0.14) + 8)
  return element("g", { className: cls("zone-title"), ...zoneData(zone) }, [
    rect(
      [...cls("mask"), ...hued(zone.hue)],
      zone.x + 8,
      zone.y + 9,
      width,
      12,
      2
    ),
    textAt(
      [...cls("legend"), ...hued(zone.hue)],
      zone.x + 12,
      zone.y + 18,
      zone.label
    ),
  ])
}
