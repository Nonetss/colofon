import type { Element, ElementContent, Properties } from "hast"
import { fromHtml } from "hast-util-from-html"
import { HUES } from "#diagrams/schema"

// A diagram drawn by hand: `diagrams/<id>.svg`, for the figures no typed
// form lays out (an exploded axonometric, a floor plan). It is read through
// a whitelist: shapes, text, groups and transforms, colours only through the
// role classes, which become the theme's colours. Everything else is
// removed and reported once per kind with how often it appeared. The page
// sanitizer (`to-hast.ts`) still checks the result, with the same patterns.

/** A number, as SVG geometry writes it. */
export const NUMBER = /^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i

/** A list of numbers, as `points` and `stroke-dasharray` write it. */
export const NUMBERS = /^[-\d.eE,\s]*$/

/** An SVG path's data. */
export const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz\d.eE,\s+-]*$/

/** A transform: translate, rotate, scale, skew or matrix functions. */
export const TRANSFORM =
  /^(\s*(matrix|translate|scale|rotate|skewX|skewY)\([-\d.eE,\s]*\)\s*)+$/

/** The role classes an illustration paints with. */
const ILLUSTRATION_ROLES = [
  "ink",
  "muted",
  "soft",
  "paper",
  "accent",
  "accent-soft",
] as const

const LINECAPS = ["butt", "round", "square"]
const LINEJOINS = ["miter", "round", "bevel"]
const ANCHORS = ["start", "middle", "end"]
const WEIGHTS = ["normal", "bold"]

type Check = (value: string) => boolean

const number: Check = (value) => NUMBER.test(value)
const opacity: Check = (value) =>
  number(value) && Number(value) >= 0 && Number(value) <= 1
const oneOf =
  (values: readonly string[]): Check =>
  (value) =>
    values.includes(value)

/** What every element accepts, with the values each attribute takes. */
const PAINT: Record<string, Check> = {
  transform: (value) => TRANSFORM.test(value),
  opacity,
  fillOpacity: opacity,
  strokeOpacity: opacity,
  strokeWidth: number,
  strokeDashArray: (value) => NUMBERS.test(value),
  strokeLineCap: oneOf(LINECAPS),
  strokeLineJoin: oneOf(LINEJOINS),
  fill: oneOf(["none"]),
  stroke: oneOf(["none"]),
}

const TEXT: Record<string, Check> = {
  x: number,
  y: number,
  dx: number,
  dy: number,
  textAnchor: oneOf(ANCHORS),
  fontSize: number,
  fontWeight: (value) => number(value) || WEIGHTS.includes(value),
}

/** Each element kept, with its own attributes. */
const ELEMENTS: Record<string, Record<string, Check>> = {
  g: {},
  path: { d: (value) => PATH_DATA.test(value) },
  rect: {
    x: number,
    y: number,
    width: number,
    height: number,
    rx: number,
    ry: number,
  },
  circle: { cx: number, cy: number, r: number },
  ellipse: { cx: number, cy: number, rx: number, ry: number },
  line: { x1: number, y1: number, x2: number, y2: number },
  polyline: { points: (value) => NUMBERS.test(value) },
  polygon: { points: (value) => NUMBERS.test(value) },
  text: TEXT,
  tspan: TEXT,
}

/** The SVG attribute names, for the reports. */
const ATTRIBUTE_NAMES: Record<string, string> = {
  className: "class",
  fillOpacity: "fill-opacity",
  strokeOpacity: "stroke-opacity",
  strokeWidth: "stroke-width",
  strokeDashArray: "stroke-dasharray",
  strokeLineCap: "stroke-linecap",
  strokeLineJoin: "stroke-linejoin",
  textAnchor: "text-anchor",
  fontSize: "font-size",
  fontWeight: "font-weight",
  viewBox: "viewBox",
  xLinkHref: "xlink:href",
}

/** What the root `<svg>` may carry without it being reported. */
const ROOT_BOILERPLATE = ["xmlns", "xmlnsXLink", "version", "width", "height"]

/** The prefix of the classes the reader's CSS paints an illustration with. */
const ROLE_CLASS = "doc-diagram-ill-"

export type Illustration = {
  title: string
  description: string
  viewBox: string
  width: number
  height: number
  /** The drawing's kept content, roles already turned into classes. */
  children: ElementContent[]
}

/** Reads an illustration's text; `null` when it cannot be drawn (reported). */
export function readIllustration(
  text: string,
  report: (message: string) => void
): Illustration | null {
  const root = parseSvg(text)
  if (root === null) {
    report("No es un SVG que se pueda leer: el fichero empieza por <svg …>")
    return null
  }
  const removed = new Map<string, number>()
  const remove = (what: string) =>
    removed.set(what, (removed.get(what) ?? 0) + 1)
  for (const key of Object.keys(root.properties)) {
    if (key === "viewBox" || ROOT_BOILERPLATE.includes(key)) continue
    remove(`el atributo ${attributeName(key)} de <svg>`)
  }
  let title: string | null = null
  let description: string | null = null
  const children: ElementContent[] = []
  for (const child of root.children) {
    if (child.type === "element" && child.tagName === "title") {
      title = textContent(child)
      continue
    }
    if (child.type === "element" && child.tagName === "desc") {
      description = textContent(child)
      continue
    }
    children.push(...kept(child, remove))
  }
  for (const [what, count] of removed)
    report(`Se ha quitado ${what} ${times(count)}${colourHint(what)}`)
  const viewBox = viewBoxOf(root.properties.viewBox)
  let ok = true
  if (viewBox === null) {
    report("Falta viewBox en <svg>: cuatro números, como 0 0 800 600")
    ok = false
  }
  if (title === null || title.trim() === "") {
    report("Falta <title> en <svg>: es el título de la ilustración")
    ok = false
  }
  if (description === null || description.trim() === "") {
    report("Falta <desc> en <svg>: qué muestra, es su texto alternativo")
    ok = false
  }
  if (!ok || viewBox === null || title === null || description === null)
    return null
  return {
    title: title.trim(),
    description: description.trim(),
    viewBox: viewBox.text,
    width: viewBox.width,
    height: viewBox.height,
    children,
  }
}

function parseSvg(text: string): Element | null {
  const tree = fromHtml(text, { fragment: true, space: "svg" })
  for (const child of tree.children) {
    if (child.type === "element" && child.tagName === "svg") return child
  }
  return null
}

/** The element kept as allowed, or nothing (counted as removed). */
function kept(
  node: ElementContent,
  remove: (what: string) => void
): ElementContent[] {
  if (node.type === "text") return [node]
  if (node.type !== "element") return []
  const allowed = ELEMENTS[node.tagName]
  if (allowed === undefined) {
    remove(`<${node.tagName}>`)
    return []
  }
  const properties: Properties = {}
  for (const [key, raw] of Object.entries(node.properties)) {
    if (key === "className") {
      const classes = rolesOf(raw, remove)
      if (classes.length > 0) properties.className = classes
      continue
    }
    const check = attributeCheck(allowed, key)
    const value = valueText(raw)
    if (check === null) {
      remove(`el atributo ${attributeName(key)}`)
      continue
    }
    if (value === null || !check(value)) {
      remove(`${attributeName(key)}="${String(raw)}"`)
      continue
    }
    properties[key] = value
  }
  const children: ElementContent[] = []
  for (const child of node.children)
    children.push(...textOrKept(node, child, remove))
  return [{ type: "element", tagName: node.tagName, properties, children }]
}

/** Text belongs only in a text; anything else goes through `kept`. */
function textOrKept(
  parent: Element,
  child: ElementContent,
  remove: (what: string) => void
): ElementContent[] {
  if (child.type !== "text") return kept(child, remove)
  if (parent.tagName === "text" || parent.tagName === "tspan") return [child]
  return []
}

function attributeCheck(
  allowed: Record<string, Check>,
  key: string
): Check | null {
  const own = allowed[key]
  if (own !== undefined) return own
  const paint = PAINT[key]
  if (paint !== undefined) return paint
  return null
}

/** The role classes of `raw`, as the reader's classes; others removed. */
function rolesOf(raw: unknown, remove: (what: string) => void): string[] {
  const classes: string[] = []
  const names = Array.isArray(raw) ? raw.map(String) : String(raw).split(/\s+/)
  for (const name of names) {
    if (name === "") continue
    if (isRole(name)) classes.push(`${ROLE_CLASS}${name}`)
    else if (isHue(name))
      classes.push(`${ROLE_CLASS}hue`, `doc-diagram-hue-${name}`)
    else remove(`la clase ${name}`)
  }
  return classes
}

function isRole(name: string): boolean {
  return ILLUSTRATION_ROLES.some((role) => role === name)
}

function isHue(name: string): boolean {
  return HUES.some((hue) => hue === name)
}

function valueText(raw: unknown): string | null {
  if (typeof raw === "string") return raw
  if (typeof raw === "number") return String(raw)
  if (Array.isArray(raw)) return raw.join(" ")
  return null
}

function attributeName(key: string): string {
  const known = ATTRIBUTE_NAMES[key]
  if (known !== undefined) return known
  if (/^on[A-Z]/.test(key)) return key.toLowerCase()
  return key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}

function times(count: number): string {
  if (count === 1) return "1 vez"
  return `${count} veces`
}

function colourHint(what: string): string {
  if (!/^(fill|stroke)=/.test(what)) return ""
  return `: los colores van con las clases ${ILLUSTRATION_ROLES.join(", ")} o un tono (${HUES.join(", ")})`
}

function textContent(node: Element): string {
  let text = ""
  for (const child of node.children) {
    if (child.type === "text") text += child.value
    else if (child.type === "element") text += textContent(child)
  }
  return text
}

function viewBoxOf(
  raw: unknown
): { text: string; width: number; height: number } | null {
  const text = valueText(raw)
  if (text === null) return null
  const parts = text
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  const [, , width, height] = parts
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part)))
    return null
  if (width === undefined || height === undefined || width <= 0 || height <= 0)
    return null
  return { text: parts.join(" "), width, height }
}
