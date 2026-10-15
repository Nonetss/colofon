// The interactive diagrams of a documentation page (`diagram-svg.ts` in
// `packages/content` draws them). Hovering or focusing a box, an arrow (its
// wide invisible twin), a badge or a zone title lights up what it touches and
// fades the rest (`diagram-graph.ts` works out what), and a card next to the
// pointer says what it is. On a touch screen the first tap does that and the
// second one follows the box's link. It listens on the document, so it also
// works on the pages the router swaps in and in the lightbox's copy.

import {
  boxHighlight,
  type Card,
  edgeHighlight,
  type Graph,
  type GraphBox,
  type GraphEdge,
  type Highlight,
  zoneHighlight,
} from "@/features/docs/page/model/diagram-graph"

const SVG = "svg.doc-diagram-svg"
const ARROW = ".doc-diagram-hit, .doc-diagram-badge"
const ZONE_TITLE = ".doc-diagram-zone-title[data-zone]"
const TARGET = [
  `${SVG} [data-node]`,
  `${SVG} .doc-diagram-hit`,
  `${SVG} .doc-diagram-badge`,
  `${SVG} ${ZONE_TITLE}`,
].join(", ")

const ON = "doc-diagram-on"
const DOWN = "doc-diagram-down"
const FOCUS = "doc-diagram-focus"

function attribute(element: Element, name: string): string {
  return element.getAttribute(name) ?? ""
}

function optionalAttribute(element: Element, name: string): string | null {
  const value = element.getAttribute(name)
  if (value === null || value === "") return null
  return value
}

function textIn(element: Element, selector: string): string | null {
  const found = element.querySelector(selector)
  if (found === null) return null
  return found.textContent
}

function boxName(element: Element, id: string): string {
  const name = textIn(element, ".doc-diagram-name, .doc-diagram-table-name")
  if (name === null || name === "") return id
  return name
}

/** The graph of the drawing `svg`, read from its `data-*` attributes. */
export function graphOf(svg: Element): Graph {
  const boxes = new Map<string, GraphBox>()
  for (const element of svg.querySelectorAll("[data-node]")) {
    const id = attribute(element, "data-node")
    boxes.set(id, {
      id,
      name: boxName(element, id),
      tag: textIn(element, ".doc-diagram-tag") ?? "",
      info: attribute(element, "data-info"),
      zone: optionalAttribute(element, "data-zone"),
      trace: element.getAttribute("data-trace") === "true",
      needs: attribute(element, "data-needs").split(" ").filter(Boolean),
    })
  }
  const edges: GraphEdge[] = []
  for (const element of svg.querySelectorAll(ARROW)) {
    const id = attribute(element, "data-edge")
    const line = svg.querySelector(`.doc-diagram-edge[data-edge="${id}"]`)
    edges.push({
      id,
      from: optionalAttribute(element, "data-from"),
      to: optionalAttribute(element, "data-to"),
      toZone: optionalAttribute(element, "data-to-zone"),
      label: attribute(element, "data-label"),
      info: attribute(element, "data-info"),
      accent: line?.classList.contains("doc-diagram-edge-accent") === true,
    })
  }
  const zones = new Map<string, string>()
  for (const element of svg.querySelectorAll(ZONE_TITLE))
    zones.set(attribute(element, "data-zone"), element.textContent ?? "")
  return { boxes, edges, zones }
}

// ── Lighting up ─────────────────────────────────────────────────────────

export function clearHighlight(svg: Element) {
  svg.classList.remove(FOCUS)
  for (const element of svg.querySelectorAll(`.${ON}, .${DOWN}`))
    element.classList.remove(ON, DOWN)
}

function applyHighlight(svg: Element, highlight: Highlight) {
  clearHighlight(svg)
  for (const element of svg.querySelectorAll("[data-edge]"))
    if (highlight.edges.has(attribute(element, "data-edge")))
      element.classList.add(ON)
  for (const element of svg.querySelectorAll("[data-node]")) {
    const id = attribute(element, "data-node")
    if (highlight.boxes.has(id)) element.classList.add(ON)
    if (highlight.down.has(id)) element.classList.add(DOWN)
  }
  if (highlight.zone !== null)
    for (const element of svg.querySelectorAll(
      `[data-zone="${CSS.escape(highlight.zone)}"]`
    ))
      if (!element.hasAttribute("data-node")) element.classList.add(ON)
  svg.classList.add(FOCUS)
}

function highlightFor(target: Element, graph: Graph): Highlight | null {
  if (target.matches(ARROW))
    return edgeHighlight(graph, attribute(target, "data-edge"))
  if (target.matches(ZONE_TITLE))
    return zoneHighlight(graph, attribute(target, "data-zone"))
  const id = optionalAttribute(target, "data-node")
  if (id === null) return null
  return boxHighlight(graph, id)
}

/** Lights up what `target` touches and returns its card, if it has one. */
export function showFor(target: Element): Card | null {
  const svg = target.closest(SVG)
  if (svg === null) return null
  const highlight = highlightFor(target, graphOf(svg))
  if (highlight === null) return null
  applyHighlight(svg, highlight)
  return highlight.card
}

// ── The card ────────────────────────────────────────────────────────────

let tip: HTMLElement | null = null

function tipElement(): HTMLElement {
  if (tip !== null) return tip
  const created = document.createElement("div")
  created.className = "doc-diagram-tip"
  created.setAttribute("role", "tooltip")
  tip = created
  return created
}

function tagElement(text: string): HTMLElement {
  const span = document.createElement("span")
  span.className = "doc-diagram-tip-tag"
  span.textContent = text
  return span
}

function fillCard(element: HTMLElement, card: Card) {
  element.replaceChildren()
  const head = document.createElement("div")
  head.className = "doc-diagram-tip-head"
  const title = document.createElement("strong")
  title.textContent = card.title
  head.append(title)
  if (card.tag !== "") head.append(tagElement(card.tag))
  element.append(head)
  if (card.text !== "") {
    const text = document.createElement("p")
    text.textContent = card.text
    element.append(text)
  }
  for (const [caption = "", ...items] of card.lists) {
    const heading = document.createElement("div")
    heading.className = "doc-diagram-tip-caption"
    heading.textContent = caption
    const list = document.createElement("ul")
    for (const entry of items) {
      const [text = "", label] = entry.split("\t")
      const line = document.createElement("li")
      line.textContent = text
      if (label !== undefined) line.append(" ", tagElement(label))
      list.append(line)
    }
    element.append(heading, list)
  }
}

/** Puts the card next to (x, y), inside the screen. */
function place(element: HTMLElement, x: number, y: number) {
  const { width, height } = element.getBoundingClientRect()
  const right = x + 16 + width > window.innerWidth - 8
  const left = right ? x - 16 - width : x + 16
  const top = Math.min(y + 16, window.innerHeight - height - 8)
  element.style.left = `${Math.max(8, left)}px`
  element.style.top = `${Math.max(8, top)}px`
}

/** Inside the lightbox (a modal <dialog>) only what is in it is on top. */
function hostOf(near: Element): Element {
  const dialog = near.closest("dialog")
  if (dialog !== null) return dialog
  return document.body
}

function render(card: Card, near: Element, point: Point | null) {
  const element = tipElement()
  const host = hostOf(near)
  if (element.parentElement !== host) host.append(element)
  fillCard(element, card)
  element.hidden = false
  if (point !== null) {
    place(element, point.x, point.y)
    return
  }
  const box = near.getBoundingClientRect()
  place(element, box.right, box.top)
}

function hideCard() {
  if (tip !== null) tip.hidden = true
}

// ── Events ──────────────────────────────────────────────────────────────

type Point = { x: number; y: number }

let current: Element | null = null
let pinned: Element | null = null
let lastPointer = "mouse"
let started = false

function enter(target: Element, point: Point | null) {
  const card = showFor(target)
  current = target
  if (card !== null) render(card, target, point)
}

function leave() {
  if (pinned !== null) return
  const svg = current?.closest(SVG)
  if (svg !== null && svg !== undefined) clearHighlight(svg)
  current = null
  hideCard()
}

function targetOf(node: EventTarget | null): Element | null {
  if (!(node instanceof Element)) return null
  return node.closest(TARGET)
}

/** Sets up the diagrams' highlighting for the whole session, once. */
export function setupDiagramHighlights() {
  if (started) return
  started = true
  document.addEventListener("pointerdown", (event) => {
    lastPointer = event.pointerType
  })
  document.addEventListener("pointerover", (event) => {
    if (event.pointerType === "touch") return
    const target = targetOf(event.target)
    if (target !== null && target !== current && pinned === null)
      enter(target, { x: event.clientX, y: event.clientY })
  })
  document.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" || pinned !== null || current === null)
      return
    if (tip === null || tip.hidden || targetOf(event.target) !== current) return
    place(tip, event.clientX, event.clientY)
  })
  document.addEventListener("pointerout", (event) => {
    if (event.pointerType === "touch") return
    const target = targetOf(event.target)
    if (target !== null && targetOf(event.relatedTarget) !== target) leave()
  })
  document.addEventListener("focusin", (event) => {
    const target = targetOf(event.target)
    if (target !== null) enter(target, null)
  })
  document.addEventListener("focusout", () => leave())
  // On a touch screen the first tap shows, the second one follows the link.
  document.addEventListener(
    "click",
    (event) => {
      const target = targetOf(event.target)
      if (lastPointer === "touch" && target !== null) {
        if (pinned === target) return
        event.preventDefault()
        event.stopPropagation()
        pinned = null
        enter(target, null)
        pinned = target
        return
      }
      if (pinned !== null && target === null) {
        pinned = null
        leave()
      }
    },
    true
  )
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || current === null) return
    pinned = null
    leave()
  })
}
