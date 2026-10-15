import { describe, expect, test } from "bun:test"
import type { Element } from "hast"
import { sanitize } from "hast-util-sanitize"
import { toHtml } from "hast-util-to-html"
import { type Diagram, diagramFigure, readDiagram } from "#pages/diagrams"
import { SANITIZE_SCHEMA } from "#pages/to-hast"

const NO_CONTENT = { catalog: new Map(), pages: new Set(["", "red"]) }

/** The diagram `spec` describes, failing the test on any problem. */
function diagramOf(spec: Record<string, unknown>): Diagram {
  const read = readDiagram(
    "red",
    "diagramas/red.json",
    JSON.stringify({ title: "Red", desc: "La red", ...spec }),
    NO_CONTENT
  )
  if (read.diagram === null || read.problems.length > 0)
    throw new Error(JSON.stringify(read.problems))
  return read.diagram
}

function figureOf(spec: Record<string, unknown>): Element {
  return diagramFigure(diagramOf(spec), (pagePath) => `/casa/${pagePath}`)
}

function drawing(spec: Record<string, unknown>): string {
  return toHtml(figureOf(spec))
}

const SIZE = { width: 400, height: 200 }

function box(id: string, x: number, extra: Record<string, unknown> = {}) {
  return { id, name: id.toUpperCase(), x, y: 40, w: 120, h: 72, ...extra }
}

const A_TO_B = {
  from: "a",
  to: "b",
  points: [
    [120, 76],
    [200, 76],
  ],
}

describe("the drawing", () => {
  test("a table box shows its name, tag, a hairline and its columns, and is as tall as its rows", () => {
    const html = drawing({
      ...SIZE,
      nodes: [
        {
          id: "user",
          name: "user",
          tag: "Auth",
          x: 0,
          y: 0,
          w: 220,
          rows: [
            { key: "PK", name: "id", type: "text" },
            { name: "email", type: "text" },
          ],
          more: "+ 4 columnas más",
        },
      ],
    })
    // 36 + 14 × 2 + 14 + 6
    expect(html).toContain(
      '<rect class="doc-diagram-node doc-diagram-service" x="0" y="0" width="220" height="84" rx="6">'
    )
    expect(html).toContain(
      '<text class="doc-diagram-table-name" x="12" y="20" text-anchor="start">user</text>'
    )
    expect(html).toContain('<path class="doc-diagram-hair" d="M0 30 H220">')
    expect(html).toContain(
      '<text class="doc-diagram-key doc-diagram-key-pk" x="12" y="46" text-anchor="start">PK</text>'
    )
    expect(html).toContain(
      '<text class="doc-diagram-type" x="208" y="60" text-anchor="end">text</text>'
    )
    expect(html).toContain(">+ 4 columnas más</text>")
    expect(html).toContain(">AUTH</text>")
  })

  test("a pill and a cylinder, and `shapes` gives a kind its shape in the boxes and the legend", () => {
    const html = drawing({
      ...SIZE,
      shapes: { store: "cylinder" },
      nodes: [
        box("a", 0, { kind: "input", shape: "pill" }),
        box("b", 200, { kind: "store" }),
      ],
    })
    expect(html).toContain(
      '<rect class="doc-diagram-node doc-diagram-input" x="0" y="40" width="120" height="72" rx="36">'
    )
    expect(html).toContain(
      'class="doc-diagram-node doc-diagram-store doc-diagram-rim"'
    )
    expect(html.match(/doc-diagram-store doc-diagram-rim/g)).toHaveLength(2)
  })

  test("a box takes its zone's hue, and with colorEdges its arrows take it too", () => {
    const html = drawing({
      ...SIZE,
      colorEdges: true,
      zones: [
        { id: "casa", x: 0, y: 20, w: 140, h: 120, label: "CASA", hue: "teal" },
      ],
      nodes: [box("a", 10, { zone: "casa" }), box("b", 200)],
      edges: [A_TO_B],
    })
    expect(html).toContain(
      '<g class="doc-diagram-box doc-diagram-hued doc-diagram-hue-teal" data-node="a" data-zone="casa">'
    )
    expect(html).toContain(
      '<path class="doc-diagram-edge doc-diagram-hued doc-diagram-hue-teal" data-edge="0"'
    )
    expect(html).toContain(
      '<path class="doc-diagram-head doc-diagram-hued doc-diagram-hue-teal" data-edge="0"'
    )
    expect(html).toContain(
      '<rect class="doc-diagram-zone doc-diagram-hued doc-diagram-hue-teal" data-zone="casa"'
    )
  })

  test("an arrow's head points along its last segment, and noHead leaves it out", () => {
    const html = drawing({
      ...SIZE,
      nodes: [box("a", 0), box("b", 200)],
      edges: [A_TO_B, { ...A_TO_B, noHead: true }],
    })
    expect(html).toContain(
      '<path class="doc-diagram-head" data-edge="0" data-from="a" data-to="b" d="M201.2 76 L191.6 79.6 L191.6 72.4 Z">'
    )
    expect(html).not.toContain('<path class="doc-diagram-head" data-edge="1"')
  })

  test("corners are rounded, an accent label is in the accent colour and anchored as told", () => {
    const html = drawing({
      ...SIZE,
      nodes: [box("a", 0), box("b", 200, { y: 140 })],
      edges: [
        {
          from: "a",
          to: "b",
          kind: "accent",
          points: [
            [60, 112],
            [60, 176],
            [200, 176],
          ],
          label: "CURL",
          at: [72, 150],
          anchor: "start",
        },
      ],
    })
    expect(html).toContain('d="M60 112 L60 168 Q60 176 68 176 L200 176"')
    expect(html).toContain(
      '<text class="doc-diagram-label doc-diagram-label-accent" x="72" y="150" text-anchor="start">CURL</text>'
    )
    expect(html).toContain('<rect class="doc-diagram-mask" x="68" y="141"')
  })

  test("the legend uses kindNames and edgeNames, and wraps when it does not fit", () => {
    const html = drawing({
      width: 300,
      height: 120,
      kindNames: { service: "Centro" },
      edgeNames: { default: "Salida a internet" },
      nodes: [box("a", 0), box("b", 160, { kind: "external" })],
      edges: [A_TO_B],
    })
    expect(html).toContain(">Centro</text>")
    expect(html).toContain(">Salida a internet</text>")
    expect(html).not.toContain(">Servicio</text>")
    // Three items on 300px: the legend starts at 148 and wraps once.
    expect(html).toContain(
      '<text class="doc-diagram-legend" x="24" y="152" text-anchor="start">LEYENDA</text>'
    )
    expect(html).toContain('viewBox="0 0 300 202"')
  })

  test("a note is free text, and a box with info, trace and needs carries them", () => {
    const html = drawing({
      ...SIZE,
      notes: [{ x: 10, y: 190, text: "hasta 4 TB" }],
      nodes: [
        box("a", 0, { info: "El origen", trace: true }),
        box("b", 200, { needs: ["a"] }),
      ],
    })
    expect(html).toContain(
      '<text class="doc-diagram-note" x="10" y="190" text-anchor="start">hasta 4 TB</text>'
    )
    expect(html).toContain(
      'data-node="a" data-trace="true" data-info="El origen"'
    )
    expect(html).toContain('data-node="b" data-needs="a"')
  })

  test("a drawing 640px or wider keeps its size on narrow screens", () => {
    expect(
      drawing({ width: 640, height: 100, nodes: [box("a", 0)] })
    ).toContain('class="doc-diagram-svg doc-diagram-svg-wide"')
    expect(drawing({ ...SIZE, nodes: [box("a", 0)] })).toContain(
      'class="doc-diagram-svg" viewBox'
    )
  })
})

describe("the sanitizer and a diagram's SVG", () => {
  test("keeps every part of a drawing: shapes, text, classes, links and data", () => {
    const figure = figureOf({
      ...SIZE,
      zones: [
        { id: "casa", x: 0, y: 20, w: 140, h: 120, label: "CASA", hue: "teal" },
      ],
      nodes: [
        box("a", 10, { zone: "casa", info: "Origen", tag: "1", page: "red" }),
        box("b", 200, { needs: ["a"], trace: true, shape: "cylinder" }),
        {
          id: "t",
          name: "user",
          x: 0,
          y: 150,
          w: 200,
          rows: [{ key: "PK", name: "id", type: "text" }],
        },
      ],
      edges: [
        {
          ...A_TO_B,
          label: "PULL",
          at: [160, 66],
          info: "Cada hora",
          anchor: "end",
        },
        {
          from: "b",
          toZone: "casa",
          points: [
            [260, 112],
            [260, 130],
            [140, 130],
          ],
        },
        { from: "a", to: "b", badge: "SSO" },
      ],
      notes: [{ x: 300, y: 190, text: "nota", anchor: "end" }],
    })
    const html = toHtml(figure)
    expect(toHtml(sanitize(figure, SANITIZE_SCHEMA))).toBe(html)
    for (const kept of [
      "data-node",
      "data-zone",
      "data-trace",
      "data-needs",
      "data-edge",
      "data-from",
      "data-to",
      "data-to-zone",
      "data-label",
      "data-info",
      'href="/casa/red"',
    ])
      expect(html).toContain(kept)
  })

  test("strips styles, handlers, foreign classes, foreign elements and javascript links", () => {
    const tree: Element = {
      type: "element",
      tagName: "svg",
      properties: { className: ["doc-diagram-svg"] },
      children: [
        {
          type: "element",
          tagName: "rect",
          properties: {
            id: "x",
            style: "fill:red",
            onClick: "alert(1)",
            className: ["evil"],
          },
          children: [],
        },
        {
          type: "element",
          tagName: "a",
          properties: {
            href: "javascript:alert(1)",
            className: ["doc-diagram-link"],
          },
          children: [
            {
              type: "element",
              tagName: "path",
              properties: { d: "M0 0" },
              children: [],
            },
          ],
        },
        {
          type: "element",
          tagName: "foreignObject",
          properties: {},
          children: [],
        },
        {
          type: "element",
          tagName: "use",
          properties: { href: "#x" },
          children: [],
        },
        {
          type: "element",
          tagName: "marker",
          properties: { id: "arrow" },
          children: [],
        },
      ],
    }
    const html = toHtml(sanitize(tree, SANITIZE_SCHEMA))
    expect(html).toContain(
      '<a class="doc-diagram-link"><path d="M0 0"></path></a>'
    )
    for (const removed of [
      "style",
      "onclick",
      "evil",
      "javascript",
      "foreignObject",
      "<use",
      "<marker",
    ])
      expect(html).not.toContain(removed)
  })
})
