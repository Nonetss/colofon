import { describe, expect, test } from "bun:test"
import {
  boxHighlight,
  edgeHighlight,
  fallsWith,
  type Graph,
  type GraphBox,
  type GraphEdge,
  zoneHighlight,
} from "@/features/docs/page/model/diagram-graph"

function box(id: string, extra: Partial<GraphBox> = {}): GraphBox {
  const name = id.charAt(0).toUpperCase() + id.slice(1)
  return {
    id,
    name,
    tag: "",
    info: "",
    zone: null,
    trace: false,
    needs: [],
    ...extra,
  }
}

function edge(id: string, extra: Partial<GraphEdge>): GraphEdge {
  return {
    id,
    from: null,
    to: null,
    toZone: null,
    label: "",
    info: "",
    accent: false,
    ...extra,
  }
}

function graphOf(
  boxes: GraphBox[],
  edges: GraphEdge[],
  zones: [string, string][] = []
): Graph {
  return {
    boxes: new Map(boxes.map((item) => [item.id, item])),
    edges,
    zones: new Map(zones),
  }
}

const KOMODO = graphOf(
  [
    box("komodo", { tag: "CORE", info: "Despliega" }),
    box("periphery"),
    box("stacks"),
  ],
  [
    edge("0", { from: "komodo", to: "periphery", label: "DEPLOY" }),
    edge("1", { from: "periphery", to: "stacks" }),
  ]
)

describe("boxHighlight", () => {
  test("hovering a box lights its arrows and their far ends, and lists its connections", () => {
    const lit = boxHighlight(KOMODO, "komodo")
    expect(lit?.boxes).toEqual(new Set(["komodo", "periphery"]))
    expect(lit?.edges).toEqual(new Set(["0"]))
    expect(lit?.card).toEqual({
      title: "Komodo",
      tag: "CORE",
      text: "Despliega",
      lists: [["Conexiones", "→ Periphery\tDEPLOY"]],
    })
    expect(boxHighlight(KOMODO, "periphery")?.card.lists).toEqual([
      ["Conexiones", "← Komodo\tDEPLOY", "→ Stacks"],
    ])
  })

  test("what falls with a box stays lit, marked, and is listed with the box it falls through", () => {
    const graph = graphOf(
      [
        box("authentik"),
        box("grafana", { needs: ["authentik"] }),
        box("wiki", { needs: ["grafana"] }),
      ],
      []
    )
    expect(fallsWith(graph, "authentik")).toEqual(
      new Map([
        ["grafana", "authentik"],
        ["wiki", "grafana"],
      ])
    )
    const lit = boxHighlight(graph, "authentik")
    expect(lit?.down).toEqual(new Set(["grafana", "wiki"]))
    expect(lit?.boxes).toEqual(new Set(["authentik", "grafana", "wiki"]))
    expect(lit?.card.lists).toEqual([
      ["Si se cae, afecta a", "Grafana", "Wiki\tpor Grafana"],
    ])
    expect(boxHighlight(graph, "wiki")?.card.lists).toEqual([
      ["Depende de", "Grafana"],
    ])
  })

  test("a box with trace lights everything reached along the accent arrows, plus its own other arrows", () => {
    const graph = graphOf(
      [
        box("user", { trace: true }),
        box("proxy"),
        box("app", { zone: "apps" }),
        box("db", { zone: "apps" }),
        box("logs"),
      ],
      [
        edge("0", { from: "user", to: "proxy", accent: true }),
        edge("1", { from: "proxy", toZone: "apps", accent: true }),
        edge("2", { from: "app", to: "logs" }),
        edge("3", { from: "user", to: "logs" }),
      ],
      [["apps", "APLICACIONES"]]
    )
    const lit = boxHighlight(graph, "user")
    expect(lit?.boxes).toEqual(new Set(["user", "proxy", "app", "db", "logs"]))
    expect(lit?.edges).toEqual(new Set(["0", "1", "3"]))
    expect(lit?.card.lists).toEqual([
      ["Camino principal", "User → Proxy", "Proxy → APLICACIONES"],
    ])
  })

  test("an arrow to a whole zone touches every box of it", () => {
    const graph = graphOf(
      [box("proxy"), box("app", { zone: "apps" })],
      [edge("0", { from: "proxy", toZone: "apps" })],
      [["apps", "APLICACIONES"]]
    )
    expect(boxHighlight(graph, "app")?.card.lists).toEqual([
      ["Conexiones", "← Proxy"],
    ])
    expect(boxHighlight(graph, "proxy")?.card.lists).toEqual([
      ["Conexiones", "→ APLICACIONES"],
    ])
  })
})

describe("edgeHighlight and zoneHighlight", () => {
  test("an arrow lights itself and its ends", () => {
    const lit = edgeHighlight(KOMODO, "0")
    expect(lit?.boxes).toEqual(new Set(["komodo", "periphery"]))
    expect(lit?.card).toEqual({
      title: "Komodo → Periphery",
      tag: "DEPLOY",
      text: "",
      lists: [],
    })
    expect(edgeHighlight(KOMODO, "9")).toBeNull()
  })

  test("a zone title lights its boxes and every arrow that touches them", () => {
    const graph = graphOf(
      [box("nas", { zone: "casa" }), box("pve", { zone: "casa" }), box("vps")],
      [
        edge("0", { from: "vps", to: "nas" }),
        edge("1", { from: "vps", to: "vps" }),
      ],
      [["casa", "CASA"]]
    )
    const lit = zoneHighlight(graph, "casa")
    expect(lit.boxes).toEqual(new Set(["nas", "pve"]))
    expect(lit.edges).toEqual(new Set(["0"]))
    expect(lit.zone).toBe("casa")
    expect(lit.card).toEqual({
      title: "CASA",
      tag: "2 piezas",
      text: "Nas · Pve",
      lists: [],
    })
  })
})
