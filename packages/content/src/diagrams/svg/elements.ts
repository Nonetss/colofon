import type { Element, ElementContent, Properties } from "hast"
import type { Anchor, Hue } from "#diagrams/schema"

// The hast builders every part of a drawn diagram uses: elements, text, the
// coordinates as written, and the classes that tie them to the reader's CSS.

export const P = "doc-diagram-"
export function element(
  tagName: string,
  properties: Properties,
  children: ElementContent[] = []
): Element {
  return { type: "element", tagName, properties, children }
}

export function text(value: string): ElementContent {
  return { type: "text", value }
}

/** A coordinate as written in the SVG, to a tenth of a pixel. */
export function n(value: number): string {
  return String(Math.round(value * 10) / 10)
}

/** The classes of something tinted by `hue`, none without one. */
export function hued(hue: Hue | null): string[] {
  if (hue === null) return []
  return [`${P}hued`, `${P}hue-${hue}`]
}

export function cls(...names: string[]): string[] {
  return names.map((name) => `${P}${name}`)
}

export function rect(
  className: string[],
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  data: Properties = {}
): Element {
  return element("rect", {
    className,
    ...data,
    x: n(x),
    y: n(y),
    width: n(width),
    height: n(height),
    rx: n(radius),
  })
}

export function textAt(
  className: string[],
  x: number,
  y: number,
  value: string,
  anchor: Anchor = "start"
): Element {
  return element("text", { className, x: n(x), y: n(y), textAnchor: anchor }, [
    text(value),
  ])
}

/** A hairline from (x1, y) to (x2, y). */
export function hair(x1: number, x2: number, y: number): Element {
  return element("path", {
    className: cls("hair"),
    d: `M${n(x1)} ${n(y)} H${n(x2)}`,
  })
}
