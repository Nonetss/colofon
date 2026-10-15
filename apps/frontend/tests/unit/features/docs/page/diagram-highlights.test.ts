import { afterEach, describe, expect, test } from "bun:test"
import {
  graphOf,
  setupDiagramHighlights,
  showFor,
} from "@/features/docs/page/model/diagram-highlights"

// A drawing as `diagram-svg.ts` writes it: two boxes, the arrow between them
// (line, head, hit band, label) and a zone around the first box.
const DRAWING = `
<svg class="doc-diagram-svg" viewBox="0 0 400 200">
  <rect class="doc-diagram-zone" data-zone="casa" x="0" y="0" width="200" height="150" rx="8"></rect>
  <path class="doc-diagram-edge doc-diagram-edge-accent" data-edge="0" data-from="komodo" data-to="periphery" d="M120 76 L200 76"></path>
  <path class="doc-diagram-head doc-diagram-head-accent" data-edge="0" data-from="komodo" data-to="periphery" d="M0 0"></path>
  <path class="doc-diagram-hit" data-edge="0" data-from="komodo" data-to="periphery" data-label="DEPLOY" data-info="Cada hora" d="M120 76 L200 76"></path>
  <g class="doc-diagram-zone-title" data-zone="casa"><text class="doc-diagram-legend">CASA</text></g>
  <g class="doc-diagram-edge-label" data-edge="0"><text class="doc-diagram-label">DEPLOY</text></g>
  <a class="doc-diagram-box doc-diagram-link" href="/casa/komodo" data-node="komodo" data-zone="casa" data-info="Despliega">
    <rect class="doc-diagram-node doc-diagram-focal"></rect>
    <text class="doc-diagram-tag">CORE</text>
    <text class="doc-diagram-name">Komodo</text>
  </a>
  <g class="doc-diagram-box" data-node="periphery" data-needs="komodo">
    <rect class="doc-diagram-node doc-diagram-service"></rect>
    <text class="doc-diagram-name">Periphery</text>
  </g>
  <g class="doc-diagram-box" data-node="otro"><text class="doc-diagram-name">Otro</text></g>
</svg>`

function drawing(): Element {
  const root = document.createElement("div")
  root.className = "doc"
  root.innerHTML = DRAWING
  document.body.append(root)
  const svg = root.querySelector("svg")
  if (svg === null) throw new Error("no svg")
  return svg
}

function part(svg: Element, selector: string): Element {
  const found = svg.querySelector(selector)
  if (found === null) throw new Error(`no ${selector}`)
  return found
}

/** The id a lit part is known by: its box, arrow or zone. */
function idOf(element: Element): string {
  for (const name of ["data-node", "data-edge", "data-zone"]) {
    const value = element.getAttribute(name)
    if (value !== null) return value
  }
  return ""
}

function lit(svg: Element): string[] {
  return [...svg.querySelectorAll(".doc-diagram-on")].map((element) => {
    const [first = ""] = (element.getAttribute("class") ?? "").split(" ")
    return `${first}:${idOf(element)}`
  })
}

afterEach(() => {
  document.body.replaceChildren()
})

describe("graphOf", () => {
  test("reads boxes, arrows and zones from the drawing's data", () => {
    const graph = graphOf(drawing())
    expect(graph.boxes.get("komodo")).toEqual({
      id: "komodo",
      name: "Komodo",
      tag: "CORE",
      info: "Despliega",
      zone: "casa",
      trace: false,
      needs: [],
    })
    expect(graph.boxes.get("periphery")?.needs).toEqual(["komodo"])
    expect(graph.edges).toEqual([
      {
        id: "0",
        from: "komodo",
        to: "periphery",
        toZone: null,
        label: "DEPLOY",
        info: "Cada hora",
        accent: true,
      },
    ])
    expect(graph.zones).toEqual(new Map([["casa", "CASA"]]))
  })
})

describe("showFor", () => {
  test("hovering a box lights it, its arrow's parts and its far end, marks what falls, and fades the rest", () => {
    const svg = drawing()
    const card = showFor(part(svg, '[data-node="komodo"]'))
    expect(svg.classList.contains("doc-diagram-focus")).toBe(true)
    expect(lit(svg)).toEqual([
      "doc-diagram-edge:0",
      "doc-diagram-head:0",
      "doc-diagram-hit:0",
      "doc-diagram-edge-label:0",
      "doc-diagram-box:komodo",
      "doc-diagram-box:periphery",
    ])
    expect(
      part(svg, '[data-node="periphery"]').classList.contains(
        "doc-diagram-down"
      )
    ).toBe(true)
    expect(card?.lists).toEqual([
      ["Conexiones", "→ Periphery\tDEPLOY"],
      ["Si se cae, afecta a", "Periphery"],
    ])
  })

  test("hovering a zone title lights the zone's frame, title and boxes", () => {
    const svg = drawing()
    showFor(part(svg, ".doc-diagram-zone-title"))
    expect(lit(svg)).toContain("doc-diagram-zone:casa")
    expect(lit(svg)).toContain("doc-diagram-zone-title:casa")
    expect(lit(svg)).toContain("doc-diagram-box:komodo")
    expect(lit(svg)).not.toContain("doc-diagram-box:otro")
  })
})

describe("setupDiagramHighlights", () => {
  test("on a touch screen the first tap on a linked box shows its card and keeps the link from opening; the second follows it", () => {
    setupDiagramHighlights()
    const svg = drawing()
    const link = part(svg, '[data-node="komodo"]')
    const name = part(link, ".doc-diagram-name")
    name.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" })
    )
    const first = new MouseEvent("click", { bubbles: true, cancelable: true })
    name.dispatchEvent(first)
    expect(first.defaultPrevented).toBe(true)
    expect(document.querySelector(".doc-diagram-tip strong")?.textContent).toBe(
      "Komodo"
    )
    const second = new MouseEvent("click", { bubbles: true, cancelable: true })
    name.dispatchEvent(second)
    expect(second.defaultPrevented).toBe(false)
  })
})
