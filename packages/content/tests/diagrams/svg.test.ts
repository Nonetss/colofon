import { describe, expect, test } from "bun:test"
import type { Element } from "hast"
import { sanitize } from "hast-util-sanitize"
import { toHtml } from "hast-util-to-html"
import { diagramFigure } from "#diagrams/figure"
import type { Diagram } from "#diagrams/model"
import { readDiagram } from "#diagrams/read"
import { SANITIZE_SCHEMA } from "#pages/to-hast"

const NO_CONTENT = { catalog: new Map(), pages: new Set(["", "red"]) }

/** The diagram `spec` describes, failing the test on any problem. */
function diagramOf(spec: Record<string, unknown>): Diagram {
  const read = readDiagram(
    "red",
    "diagrams/red.json",
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

describe("the drawn form's shapes and arrows", () => {
  test("a diamond is the rhombus whose corners touch the middle of each side, a circle the one inscribed", () => {
    const html = drawing({
      ...SIZE,
      nodes: [
        box("a", 0, { shape: "diamond", w: 160, h: 80 }),
        box("b", 200, { shape: "circle", w: 60, h: 60 }),
        box("c", 300, { shape: "rounded", w: 90, h: 60 }),
      ],
    })
    expect(html).toContain(
      '<path class="doc-diagram-node doc-diagram-service" d="M80 40 L160 80 L80 120 L0 80 Z">'
    )
    expect(html).toContain(
      '<circle class="doc-diagram-node doc-diagram-service" cx="230" cy="70" r="30">'
    )
    expect(html).toContain(
      '<rect class="doc-diagram-node doc-diagram-service" x="300" y="40" width="90" height="60" rx="20">'
    )
  })

  test("a curved edge may run diagonally and is drawn as a smooth curve", () => {
    const html = drawing({
      ...SIZE,
      nodes: [box("a", 0), box("b", 200)],
      edges: [
        {
          from: "a",
          to: "b",
          route: "curve",
          points: [
            [100, 40],
            [160, 20],
            [200, 80],
          ],
        },
      ],
    })
    expect(html).toMatch(
      /<path class="doc-diagram-edge" data-edge="0" data-from="a" data-to="b" d="M100 40 C[^"]+ C[^"]+ 200 80">/
    )
  })

  test("an arrow from a box to itself without points loops over its corner with its label beside it", () => {
    const html = drawing({
      ...SIZE,
      nodes: [box("a", 40)],
      edges: [{ from: "a", to: "a", label: "FALLO" }],
    })
    // The box is 120 wide at x 40 and y 40: the loop leaves its top 24px
    // from its right side and comes back into that side.
    expect(html).toContain(
      'data-edge="0" data-from="a" data-to="a" d="M136 40 L136 28 Q136 20 144 20 L172 20 Q180 20 180 28 L180 48 Q180 56 172 56 L160 56">'
    )
    expect(html).toContain(">FALLO</text>")
  })

  test("UML heads: a hollow triangle and a filled or hollow diamond", () => {
    const html = drawing({
      ...SIZE,
      nodes: [box("a", 0), box("b", 200)],
      edges: [
        { ...A_TO_B, head: "triangle" },
        { ...A_TO_B, head: "diamond" },
        { ...A_TO_B, head: "open-diamond" },
      ],
    })
    expect(html).toContain(
      '<path class="doc-diagram-head doc-diagram-head-hollow" data-edge="0" data-from="a" data-to="b" d="M200 76 L188 82 L188 70 Z">'
    )
    expect(html).toContain(
      '<path class="doc-diagram-head" data-edge="1" data-from="a" data-to="b" d="M200 76 L192 81 L184 76 L192 71 Z">'
    )
    expect(html).toContain(
      '<path class="doc-diagram-head doc-diagram-head-hollow" data-edge="2"'
    )
  })

  test("a table's ops go under a hairline after its rows, and count in its height", () => {
    const html = drawing({
      ...SIZE,
      nodes: [
        {
          id: "user",
          name: "User",
          x: 0,
          y: 0,
          w: 220,
          rows: [{ key: "+", name: "email", type: "string" }],
          ops: [{ key: "+", name: "login()", type: "bool" }],
        },
      ],
    })
    // 36 + 14 + 10 + 14 + 6
    expect(html).toContain('width="220" height="80" rx="6">')
    expect(html).toContain('<path class="doc-diagram-hair" d="M0 50 H220">')
    expect(html).toContain(
      '<text class="doc-diagram-col" x="40" y="70" text-anchor="start">login()</text>'
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

  test("keeps a typed form's shapes: circles, polygons, opacities, marks, series and their legend", () => {
    const mark = (id: string) => ({
      hue: "blue" as const,
      opacity: 0.4,
      datum: {
        id,
        label: "Marzo",
        series: "Altas",
        value: "1.200",
        info: "Récord",
      },
      link: null,
    })
    const diagram: Diagram = {
      ...diagramOf({ ...SIZE, nodes: [box("a", 0)] }),
      type: "bar",
      under: [
        {
          kind: "line",
          x1: 0,
          y1: 0,
          x2: 10,
          y2: 0,
          ...mark("m0"),
          classes: ["line-rule"],
          datum: null,
        },
      ],
      over: [
        {
          kind: "rect",
          x: 1,
          y: 2,
          w: 3,
          h: 4,
          r: 0,
          classes: ["fill-hue"],
          ...mark("m1"),
        },
        {
          kind: "circle",
          cx: 5,
          cy: 5,
          r: 2,
          classes: ["fill-hue"],
          ...mark("m2"),
        },
        {
          kind: "polygon",
          points: [
            [0, 0],
            [4, 0],
            [2, 3],
          ],
          classes: ["fill-hue"],
          ...mark("m3"),
        },
        {
          kind: "text",
          x: 1,
          y: 9,
          text: "1.200",
          role: "value",
          anchor: "middle",
          mask: true,
          classes: ["text-ink"],
          hue: null,
          opacity: null,
          datum: null,
          link: "red",
        },
      ],
      legend: [
        {
          name: "Altas",
          sample: { kind: "swatch", classes: ["fill-hue"], hue: "blue" },
          series: "Altas",
        },
      ],
      text: [],
    }
    const figure = diagramFigure(diagram, (pagePath) => `/casa/${pagePath}`)
    const html = toHtml(figure)
    expect(toHtml(sanitize(figure, SANITIZE_SCHEMA))).toBe(html)
    expect(html).toContain(
      '<circle class="doc-diagram-fill-hue doc-diagram-hued doc-diagram-hue-blue doc-diagram-mark" fill-opacity="0.4" data-node="m2" data-label="Marzo" data-value="1.200" data-series="Altas" data-info="Récord" cx="5" cy="5" r="2">'
    )
    expect(html).toContain('<polygon class="doc-diagram-fill-hue')
    expect(html).toContain('points="0,0 4,0 2,3"')
    expect(html).toContain(
      '<g class="doc-diagram-legend-entry" data-series="Altas">'
    )
    expect(html).toContain('<a class="doc-diagram-link" href="/casa/red">')
  })

  test("a fill opacity that is not a number between 0 and 1 is stripped", () => {
    const tree: Element = {
      type: "element",
      tagName: "svg",
      properties: { className: ["doc-diagram-svg"] },
      children: [
        {
          type: "element",
          tagName: "circle",
          properties: { fillOpacity: "url(#x)", cx: "1" },
          children: [],
        },
      ],
    }
    expect(toHtml(sanitize(tree, SANITIZE_SCHEMA))).toBe(
      '<svg class="doc-diagram-svg"><circle cx="1"></circle></svg>'
    )
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
