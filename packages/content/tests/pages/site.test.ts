import { describe, expect, test } from "bun:test"
import type { NavNode } from "#pages/site"
import { page, pageAt, siteOf } from "#tests/fixtures/site"

function titles(nodes: NavNode[]): string[] {
  return nodes.map((node) => node.title)
}

function section(nodes: NavNode[], title: string) {
  const found = nodes.find((node) => node.title === title)
  if (found === undefined || found.kind !== "section")
    throw new Error(`No section "${title}"`)
  return found
}

const SITE = {
  "docs/index.mdx": page("Casa"),
  "docs/red/index.mdx": page("Red", "", "orden: 1\n"),
  "docs/red/dns.mdx": page("DNS", "", "orden: 2\n"),
  "docs/red/vpn.mdx": page("VPN", "", "orden: 1\n"),
  "docs/red/anexo.mdx": page("Anexo"),
  "docs/varios/zeta.mdx": page("Zeta"),
  "docs/varios/alfa.mdx": page("Alfa"),
  "docs/varios/img/foto.png": "png",
  "docs/suelta.mdx": page("Suelta", "", "orden: 5\n"),
}

describe("readSite", () => {
  test("pages are ordered by orden, those without one last, then by title", async () => {
    const site = await siteOf(SITE)
    expect(titles(site.nav)).toEqual(["Red", "Suelta", "varios"])
    expect(titles(section(site.nav, "Red").children)).toEqual([
      "VPN",
      "DNS",
      "Anexo",
    ])
    expect(titles(section(site.nav, "varios").children)).toEqual([
      "Alfa",
      "Zeta",
    ])
  })

  test("a folder without index is a section named after the folder, listing its pages", async () => {
    const site = await siteOf(SITE)
    const varios = pageAt(site, "varios")
    expect(varios.source).toBe("folder")
    expect(varios.header.titulo).toBe("varios")
    expect(varios.tree).toBeNull()
    expect(titles(varios.children)).toEqual(["Alfa", "Zeta"])
  })

  test("a folder holding only images is not a section", async () => {
    const site = await siteOf(SITE)
    expect(site.pages.has("varios/img")).toBe(false)
  })

  test("the reading order gives previous and next pages", async () => {
    const site = await siteOf(SITE)
    expect(pageAt(site, "red/vpn").next).toEqual({
      path: "red/dns",
      title: "DNS",
    })
    expect(pageAt(site, "red/dns").previous).toEqual({
      path: "red/vpn",
      title: "VPN",
    })
    expect(pageAt(site, "").previous).toBeNull()
    expect(pageAt(site, "").next).toEqual({ path: "red", title: "Red" })
    expect(pageAt(site, "red").next).toEqual({ path: "red/vpn", title: "VPN" })
    expect(pageAt(site, "varios/zeta").next).toBeNull()
  })

  test("breadcrumbs list the sections above a page", async () => {
    const site = await siteOf({
      ...SITE,
      "docs/red/vpn/index.mdx": page("VPN"),
      "docs/red/vpn/wireguard.mdx": page("WireGuard"),
    })
    expect(pageAt(site, "red/vpn/wireguard").breadcrumbs).toEqual([
      { path: "red", title: "Red" },
      { path: "red/vpn", title: "VPN" },
    ])
    expect(pageAt(site, "red").breadcrumbs).toEqual([])
  })

  test("the home is docs/index.mdx, or a folder page titled with the site name without it", async () => {
    expect(pageAt(await siteOf(SITE), "").header.titulo).toBe("Casa")
    const withoutHome = await siteOf({ "docs/red/dns.mdx": page("DNS") })
    const home = pageAt(withoutHome, "")
    expect(home.source).toBe("folder")
    expect(home.header.titulo).toBe("Casa")
    expect(titles(home.children)).toEqual(["red"])
  })

  test("problems of one page don't stop the others, and every problem is listed", async () => {
    const site = await siteOf({
      "docs/mala.mdx": "---\ntitulo: Mala\n---\n\n[x](falta.mdx)\n",
      "docs/buena.mdx": page("Buena", "Texto"),
    })
    expect(pageAt(site, "mala").problems).toHaveLength(2)
    expect(pageAt(site, "buena").problems).toEqual([])
    expect(pageAt(site, "buena").tree).not.toBeNull()
    expect(site.problems).toHaveLength(2)
  })

  test("a repository without docs/ has only its home", async () => {
    const site = await siteOf({})
    expect(site.nav).toEqual([])
    expect([...site.pages.keys()]).toEqual([""])
  })
})
