import { describe, expect, test } from "bun:test"
import {
  type DocsRepository,
  flattenPages,
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

describe("flattenPages", () => {
  test("lists the home and every page depth first with the sections above it", () => {
    expect(
      flattenPages([casa], false).map((page) => [page.href, page.trail])
    ).toEqual([
      ["/casa", []],
      ["/casa/red", []],
      ["/casa/red/dns", ["Red"]],
      ["/casa/red/vpn", ["Red"]],
      ["/casa/red/vpn/wg", ["Red", "VPN"]],
    ])
  })

  test("in Todos every trail starts with the repository's name", () => {
    const [, red] = flattenPages([casa], true)
    expect(red?.trail).toEqual(["Casa"])
  })

  test("a repository without content lists nothing", () => {
    expect(
      flattenPages([{ ...casa, home: null, nodes: [], available: false }], true)
    ).toEqual([])
  })
})

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
