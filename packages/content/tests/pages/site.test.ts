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
    expect(titles(site.nav)).toEqual(["Red", "Suelta", "varios", "Catálogo"])
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

  test("a folder holding only its index is a page with no children, keeping its order, breadcrumbs and reading order", async () => {
    const site = await siteOf({
      ...SITE,
      "docs/red/solo/index.mdx": page("Solo", "", "orden: 3\n"),
    })
    const solo = section(site.nav, "Red").children.find(
      (node) => node.title === "Solo"
    )
    expect(solo?.kind).toBe("page")
    expect(titles(section(site.nav, "Red").children)).toEqual([
      "VPN",
      "DNS",
      "Solo",
      "Anexo",
    ])
    const found = pageAt(site, "red/solo")
    expect(found.children).toEqual([])
    expect(found.breadcrumbs).toEqual([{ path: "red", title: "Red" }])
    expect(found.previous?.path).toBe("red/dns")
    expect(found.next?.path).toBe("red/anexo")
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
    expect(titles(home.children)).toEqual(["red", "Catálogo"])
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

  test("a repository without docs/ has its home and the catalog", async () => {
    const site = await siteOf({})
    expect(titles(site.nav)).toEqual(["Catálogo"])
    expect([...site.pages.keys()].sort()).toEqual([
      "",
      "catalogo",
      "catalogo/maquinas",
      "catalogo/maquinas/nas",
    ])
  })

  test("without menu.yaml the catalog section lists every type and its pages have no previous or next", async () => {
    const site = await siteOf(SITE)
    expect(titles(section(site.nav, "Catálogo").children)).toEqual(["Máquinas"])
    const machines = pageAt(site, "catalogo/maquinas")
    expect(machines.source).toBe("generated")
    expect(machines.previous).toBeNull()
    expect(machines.next).toBeNull()
    expect(machines.breadcrumbs).toEqual([
      { path: "catalogo", title: "Catálogo" },
    ])
    expect(pageAt(site, "catalogo/maquinas/nas").breadcrumbs).toEqual([
      { path: "catalogo", title: "Catálogo" },
      { path: "catalogo/maquinas", title: "Máquinas" },
    ])
  })

  test("a page under docs/catalogo is reported on the home and not served", async () => {
    const site = await siteOf({
      ...SITE,
      "docs/catalogo/index.mdx": page("Mío"),
    })
    expect(pageAt(site, "catalogo").source).toBe("generated")
    expect(pageAt(site, "catalogo").header.titulo).toBe("Catálogo")
    expect(pageAt(site, "").problems.map((p) => p.file)).toEqual([
      "docs/catalogo/index.mdx",
    ])
  })
})

/** A menu.yaml from its groups: `[titulo, extra lines, entries]`. */
function menuOf(...groups: [string, string[]][]): string {
  const lines = ["secciones:"]
  for (const [titulo, entries] of groups) {
    lines.push(`  - titulo: ${titulo}`, "    paginas:")
    for (const entry of entries) lines.push(`      - ${entry}`)
  }
  return lines.join("\n")
}

function group(nodes: NavNode[], title: string) {
  const found = nodes.find((node) => node.title === title)
  if (found === undefined || found.kind !== "group")
    throw new Error(`No group "${title}"`)
  return found
}

describe("readSite edit dates", () => {
  test("a page is dated with its file's last commit, independent of actualizado", async () => {
    const site = await siteOf(
      {
        ...SITE,
        "docs/red/vpn.mdx": page("VPN", "", "actualizado: 2026-01-10\n"),
      },
      new Map([
        ["docs/red/dns.mdx", "2026-03-02"],
        ["docs/red/vpn.mdx", "2026-10-14"],
      ])
    )
    expect(pageAt(site, "red/dns").header).toMatchObject({
      actualizado: null,
      editado: "2026-03-02",
    })
    expect(pageAt(site, "red/vpn").header).toMatchObject({
      actualizado: "2026-01-10",
      editado: "2026-10-14",
    })
  })

  test("a folder page without index has no edit date", async () => {
    const site = await siteOf(
      SITE,
      new Map([["docs/varios/alfa.mdx", "2026-03-02"]])
    )
    expect(pageAt(site, "varios").header.editado).toBeNull()
  })

  test("without dates every page has none", async () => {
    const site = await siteOf(SITE)
    for (const sitePage of site.pages.values())
      expect(sitePage.header.editado).toBeNull()
  })
})

describe("readSite with menu.yaml", () => {
  test("groups show folders and pages from anywhere, keeping each folder's order and the file paths", async () => {
    const site = await siteOf({
      ...SITE,
      "menu.yaml": menuOf(
        ["Básico", ["suelta", "red"]],
        ["Resto", ["varios", "catalogo"]]
      ),
    })
    expect(titles(site.nav)).toEqual(["Básico", "Resto"])
    expect(titles(group(site.nav, "Básico").children)).toEqual([
      "Suelta",
      "Red",
    ])
    expect(
      titles(section(group(site.nav, "Básico").children, "Red").children)
    ).toEqual(["VPN", "DNS", "Anexo"])
    expect(titles(group(site.nav, "Resto").children)).toEqual([
      "varios",
      "Catálogo",
    ])
    expect(pageAt(site, "red/dns").path).toBe("red/dns")
    expect(pageAt(site, "").problems).toEqual([])
  })

  test("breadcrumbs start with the group, as text", async () => {
    const site = await siteOf({
      ...SITE,
      "menu.yaml": menuOf(
        ["Críticas", ["red"]],
        ["Resto", ["varios", "suelta", "catalogo"]]
      ),
    })
    expect(pageAt(site, "red/dns").breadcrumbs).toEqual([
      { path: null, title: "Críticas" },
      { path: "red", title: "Red" },
    ])
    expect(pageAt(site, "catalogo/maquinas/nas").breadcrumbs).toEqual([
      { path: null, title: "Resto" },
      { path: "catalogo", title: "Catálogo" },
      { path: "catalogo/maquinas", title: "Máquinas" },
    ])
  })

  test("the reading order follows the menu across groups", async () => {
    const site = await siteOf({
      ...SITE,
      "menu.yaml": menuOf(
        ["Uno", ["suelta"]],
        ["Dos", ["red", "varios", "catalogo"]]
      ),
    })
    expect(pageAt(site, "").next).toEqual({ path: "suelta", title: "Suelta" })
    expect(pageAt(site, "suelta").next).toEqual({ path: "red", title: "Red" })
    expect(pageAt(site, "red").previous).toEqual({
      path: "suelta",
      title: "Suelta",
    })
  })

  test("entries naming nothing, the home or what an earlier entry shows are reported on menu.yaml and skipped", async () => {
    const site = await siteOf({
      ...SITE,
      "menu.yaml": menuOf(
        ["Red", ["red", "red/vpnn", "index"]],
        ["Más", ["red/dns", "varios", "suelta", "catalogo"]]
      ),
    })
    expect(titles(group(site.nav, "Red").children)).toEqual(["Red"])
    expect(titles(group(site.nav, "Más").children)).toEqual([
      "varios",
      "Suelta",
      "Catálogo",
    ])
    expect(pageAt(site, "").problems).toEqual([
      {
        file: "menu.yaml",
        line: null,
        message:
          "secciones.0.paginas.1: `red/vpnn` no es ninguna página ni carpeta de docs/, ni catalogo, ni un tipo del catálogo",
      },
      {
        file: "menu.yaml",
        line: null,
        message:
          "secciones.0.paginas.2: la portada no va en el menú: sale siempre como «Inicio»",
      },
      {
        file: "menu.yaml",
        line: null,
        message:
          "secciones.1.paginas.0: `red/dns` ya sale en el menú con `red`",
      },
    ])
  })

  test("what no entry shows goes to «Otros», each page with a problem, and is still served", async () => {
    const site = await siteOf({
      ...SITE,
      "menu.yaml": menuOf(["Red", ["red"]]),
    })
    const others = group(site.nav, "Otros")
    expect(titles(others.children)).toEqual(["Suelta", "varios", "Catálogo"])
    expect(pageAt(site, "varios/alfa").problems).toEqual([
      {
        file: "docs/varios/alfa.mdx",
        line: null,
        message: "Esta página no está en menu.yaml: sale en «Otros»",
      },
    ])
    expect(pageAt(site, "catalogo/maquinas").problems[0]?.file).toBe(
      "catalogo/maquinas"
    )
    expect(pageAt(site, "red/dns").problems).toEqual([])
  })

  test("with every page shown there is no «Otros» group", async () => {
    const site = await siteOf({
      ...SITE,
      "menu.yaml": menuOf([
        "Todo",
        ["red", "varios", "suelta", "catalogo/maquinas"],
      ]),
    })
    expect(titles(site.nav)).toEqual(["Todo"])
  })

  test("the menu's title and icon win over the header's, which is reported when it differs", async () => {
    const site = await siteOf({
      ...SITE,
      "docs/red/index.mdx": page("Red", "", "icono: box\n"),
      "docs/varios/zeta.mdx": page("Zeta", "", "icono: globe\n"),
      "menu.yaml": menuOf([
        "Todo",
        [
          "{ ruta: red, icono: layers, titulo: Redes }",
          "varios",
          "suelta",
          "{ ruta: catalogo, titulo: Datos }",
        ],
      ]),
    })
    const red = pageAt(site, "red")
    expect(red.header.icono).toBe("layers")
    expect(red.header.titulo).toBe("Redes")
    expect(section(group(site.nav, "Todo").children, "Redes").icon).toBe(
      "layers"
    )
    expect(pageAt(site, "red/dns").breadcrumbs).toEqual([
      { path: null, title: "Todo" },
      { path: "red", title: "Redes" },
    ])
    expect(red.problems.map((problem) => problem.message)).toEqual([
      "titulo: la cabecera dice «Red», pero manda menu.yaml («Redes»)",
      "icono: la cabecera dice `box`, pero manda menu.yaml (`layers`)",
    ])
    expect(pageAt(site, "varios/zeta").header.icono).toBe("globe")
    expect(pageAt(site, "varios/zeta").problems).toEqual([])
    expect(pageAt(site, "catalogo").header.titulo).toBe("Datos")
  })

  test("a folder entry holding only its index is a page with the menu's title and icon", async () => {
    const site = await siteOf({
      ...SITE,
      "docs/diagramas/index.mdx": page("Diagramas"),
      "menu.yaml": menuOf([
        "Todo",
        [
          "red",
          "{ ruta: diagramas, titulo: Dibujos, icono: workflow }",
          "varios",
          "suelta",
          "catalogo",
        ],
      ]),
    })
    const node = group(site.nav, "Todo").children.find(
      (child) => child.title === "Dibujos"
    )
    expect(node?.kind).toBe("page")
    expect(node?.icon).toBe("workflow")
    expect(pageAt(site, "diagramas").children).toEqual([])
  })

  test("a folder without index takes the menu's title and icon", async () => {
    const site = await siteOf({
      ...SITE,
      "menu.yaml": menuOf([
        "Todo",
        [
          "red",
          "{ ruta: varios, titulo: Varios, icono: box }",
          "suelta",
          "catalogo",
        ],
      ]),
    })
    const varios = section(group(site.nav, "Todo").children, "Varios")
    expect(varios.icon).toBe("box")
    expect(pageAt(site, "varios").header.titulo).toBe("Varios")
  })
})

describe("readSite with estilos/", () => {
  test("the repository's cleaned stylesheet is on the site, with its images rewritten", async () => {
    const site = await siteOf({
      ...SITE,
      "estilos/tema.css": ":root { --primary: red }",
      "estilos/pagina.css":
        ".typeset.doc { background: url(../docs/varios/img/foto.png) }",
    })
    expect(site.styles).toBe(
      ":root{--primary:red}\n.typeset.doc{background:url(/files/casa/varios/img/foto.png)}"
    )
    expect(site.problems).toEqual([])
  })

  test("a style problem goes on the home and in the site's problems", async () => {
    const site = await siteOf({
      ...SITE,
      "estilos/codigo.css": "@import 'x.css';\n.a { color: red }",
    })
    expect(site.styles).toBe(".a{color:red}")
    expect(pageAt(site, "").problems.map((p) => p.file)).toEqual([
      "estilos/codigo.css",
    ])
    expect(site.problems.map((p) => p.file)).toEqual(["estilos/codigo.css"])
  })

  test("a repository without estilos/ has an empty stylesheet and no new problem", async () => {
    const site = await siteOf(SITE)
    expect(site.styles).toBe("")
    expect(site.problems).toEqual([])
  })
})
