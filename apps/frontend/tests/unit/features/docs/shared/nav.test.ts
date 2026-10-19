import { describe, expect, test } from "bun:test"
import {
  cardBlocks,
  currentHref,
  type DocsRepository,
  pagesMeta,
  sectionsAbove,
} from "@/features/docs/shared/model/nav"

function entry(path: string, title: string) {
  return {
    path,
    href: `/casa/${path}`,
    title,
    description: `Sobre ${title}`,
    icon: null,
  }
}

const casa: DocsRepository = {
  slug: "casa",
  name: "Casa",
  title: "Homelab",
  description: null,
  available: true,
  sharedBy: null,
  home: { ...entry("", "Inicio"), href: "/casa" },
  nodes: [
    {
      kind: "section",
      ...entry("red", "Red"),
      children: [
        { kind: "page", ...entry("red/dns", "DNS") },
        {
          kind: "section",
          ...entry("red/vpn", "VPN"),
          children: [{ kind: "page", ...entry("red/vpn/wg", "WireGuard") }],
        },
      ],
    },
  ],
}

describe("sectionsAbove", () => {
  test("names the sections that hold a page, outermost first", () => {
    expect(sectionsAbove(casa.nodes, "/casa/red/vpn/wg")).toEqual([
      "/casa/red",
      "/casa/red/vpn",
    ])
  })

  test("a section's own route opens it", () => {
    expect(sectionsAbove(casa.nodes, "/casa/red")).toEqual(["/casa/red"])
  })

  test("a page outside every section opens nothing", () => {
    expect(sectionsAbove(casa.nodes, "/casa")).toEqual([])
  })

  test("a page outside the navigation opens the sections above its closest listed page", () => {
    expect(sectionsAbove(menuNodes, "/casa/catalog/maquinas/nas")).toEqual([
      "/casa/catalog",
    ])
  })
})

/** A menu group showing the catalog, whose entity pages are not listed. */
const menuNodes: DocsRepository["nodes"] = [
  {
    kind: "group",
    title: "Datos",
    description: "",
    icon: null,
    children: [
      {
        kind: "section",
        ...entry("catalog", "Referencia"),
        children: [{ kind: "page", ...entry("catalog/maquinas", "Máquinas") }],
      },
    ],
  },
]

describe("currentHref", () => {
  test("a listed page is its own current entry", () => {
    expect(currentHref(casa.nodes, "/casa/red/dns")).toBe("/casa/red/dns")
  })

  test("a page outside the navigation takes the deepest listed page above it", () => {
    expect(currentHref(menuNodes, "/casa/catalog/maquinas/nas")).toBe(
      "/casa/catalog/maquinas"
    )
    expect(currentHref(casa.nodes, "/casa/red/vpn/wg/extra")).toBe(
      "/casa/red/vpn/wg"
    )
  })

  test("a prefix counts only at a path boundary", () => {
    expect(currentHref(casa.nodes, "/casa/redes")).toBeNull()
  })

  test("the home and pages with nothing listed above them have no current entry", () => {
    expect(currentHref(casa.nodes, "/casa")).toBeNull()
    expect(currentHref(casa.nodes, "/otra/red")).toBeNull()
  })
})

describe("pagesMeta", () => {
  const [red] = casa.nodes

  test("a section counts itself and every page under it", () => {
    if (red === undefined) throw new Error("fixture without sections")
    expect(pagesMeta(red)).toBe("4 fichas")
  })

  test("a section alone is one ficha", () => {
    expect(
      pagesMeta({ kind: "section", ...entry("vacia", "Vacía"), children: [] })
    ).toBe("1 ficha")
  })

  test("a page shows no count", () => {
    expect(pagesMeta({ kind: "page", ...entry("red/dns", "DNS") })).toBe(
      undefined
    )
  })
})

// The same pages, with a menu: "Red" in the group "Infraestructura", and the
// catalog in "Datos".
const withMenu: DocsRepository = {
  ...casa,
  nodes: [
    {
      kind: "group",
      title: "Infraestructura",
      description: "Lo de casa",
      icon: "network",
      children: casa.nodes,
    },
    {
      kind: "group",
      title: "Datos",
      description: "",
      icon: null,
      children: [
        {
          kind: "section",
          ...entry("catalog", "Catálogo"),
          children: [
            { kind: "page", ...entry("catalog/machines", "Machines") },
          ],
        },
      ],
    },
  ],
}

describe("navigation with menu groups", () => {
  test("the sections above a page are found through its group", () => {
    expect(sectionsAbove(withMenu.nodes, "/casa/red/vpn/wg")).toEqual([
      "/casa/red",
      "/casa/red/vpn",
    ])
    expect(sectionsAbove(withMenu.nodes, "/casa/catalog/machines")).toEqual([
      "/casa/catalog",
    ])
  })

  test("a group counts the pages it holds, not itself", () => {
    const [infra] = withMenu.nodes
    if (infra === undefined) throw new Error("No group")
    expect(pagesMeta(infra)).toBe("4 fichas")
  })

  test("cards come in one block per group, and loose entries in their own", () => {
    const blocks = cardBlocks([...casa.nodes, ...withMenu.nodes])
    expect(
      blocks.map((block) => [
        block.group?.title ?? null,
        block.links.map((link) => link.title),
      ])
    ).toEqual([
      [null, ["Red"]],
      ["Infraestructura", ["Red"]],
      ["Datos", ["Catálogo"]],
    ])
  })
})
