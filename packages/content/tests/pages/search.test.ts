import { describe, expect, test } from "bun:test"
import {
  createSiteSearch,
  type SearchHit,
  type SiteSearch,
  searchSite,
} from "#pages/search"
import { page, siteOf } from "#tests/fixtures/site"

const LONG_TEXT = Array.from({ length: 40 }, (_, i) => `palabra${i}`).join(" ")

const SITE = {
  "docs/index.mdx": page("Casa"),
  "docs/red/index.mdx": page("Red", "La red de casa."),
  "docs/red/dns.mdx": page(
    "DNS",
    [
      "Servidor de nombres de la casa.",
      "",
      "## Resolución inversa",
      "",
      "La consulta inversa devuelve el nombre de una IP.",
    ].join("\n")
  ),
  "docs/red/vlan.mdx": page("VLAN", "Redes virtuales separadas."),
  "docs/red/router.mdx": page(
    "Router",
    "El router reparte cada vlan por su puerto."
  ),
  "docs/copias/index.mdx": page("Copias", "Todo lo que se guarda."),
  "docs/copias/plan.mdx": page("Plan", "## Copias de seguridad\n\nCada noche."),
  "docs/copias/disco.mdx": page(
    "Disco",
    "Aquí van las copias del disco grande."
  ),
  "docs/ajustes.mdx": page(
    "Ajustes",
    `${LONG_TEXT} configuración ${LONG_TEXT}`
  ),
  "docs/nodo.mdx": page("Nodos", "Cada nodo del clúster."),
  "docs/modo.mdx": page("Modos", "El modo de arranque."),
}

async function searchOf(files: Record<string, string> = SITE) {
  return createSiteSearch(await siteOf(files))
}

function titlesFor(search: SiteSearch, query: string): string[] {
  return searchSite(search, query, 20).map((hit) => hit.title)
}

function hitFor(search: SiteSearch, query: string, title: string): SearchHit {
  const found = searchSite(search, query, 20).find((hit) => hit.title === title)
  if (found === undefined) throw new Error(`No hit "${title}" for "${query}"`)
  return found
}

/** The highlighted words of a hit's excerpt. */
function highlighted(hit: SearchHit): string[] {
  const excerpt = hit.excerpt
  if (excerpt === null) return []
  return excerpt.highlights.map(({ start, end }) =>
    excerpt.text.slice(start, end)
  )
}

describe("searchSite: what is indexed", () => {
  test("a word only in the body finds the page", async () => {
    const search = await searchOf()
    expect(titlesFor(search, "inversa")).toEqual(["DNS"])
  })

  test("a new index over a changed site finds the new words", async () => {
    const before = await searchOf()
    expect(titlesFor(before, "pihole")).toEqual([])
    const after = await searchOf({
      ...SITE,
      "docs/red/dns.mdx": page("DNS", "Ahora con pihole."),
    })
    expect(titlesFor(after, "pihole")).toEqual(["DNS"])
  })

  test("header fields are searched", async () => {
    const search = await searchOf({
      "docs/servidor.mdx": page("Servidor", "", "maquinas: [nas]\n"),
    })
    expect(titlesFor(search, "nas")).toContain("Servidor")
  })

  test("catalog type pages are searched, entity pages are not", async () => {
    const search = await searchOf()
    expect(titlesFor(search, "192.168.1.30")).toEqual(["Máquinas"])
  })

  test("the home is searched", async () => {
    const search = await searchOf({ "docs/index.mdx": page("Portada", "Hola") })
    expect(hitFor(search, "hola", "Portada").path).toBe("")
  })
})

describe("searchSite: matching", () => {
  test("accents and case are ignored", async () => {
    const search = await searchOf()
    expect(titlesFor(search, "RESOLUCION")).toEqual(["DNS"])
  })

  test("every word must be found", async () => {
    const search = await searchOf()
    expect(titlesFor(search, "router vlan")).toEqual(["Router"])
    expect(titlesFor(search, "router noche")).toEqual([])
  })

  test("words are found across fields, the trail included", async () => {
    const search = await searchOf()
    expect(titlesFor(search, "red dns")).toEqual(["DNS"])
    expect(hitFor(search, "red dns", "DNS").trail).toEqual(["Red"])
  })

  test("a prefix matches", async () => {
    const search = await searchOf()
    expect(titlesFor(search, "resol")).toEqual(["DNS"])
  })

  test("a typo in a long word still matches", async () => {
    const search = await searchOf()
    expect(titlesFor(search, "confguracion")).toEqual(["Ajustes"])
  })

  test("short words are not approximated", async () => {
    const search = await searchOf()
    expect(titlesFor(search, "dms")).toEqual([])
  })

  test("an empty query finds nothing", async () => {
    const search = await searchOf()
    expect(searchSite(search, "  ¿? ", 10)).toEqual([])
  })

  test("the typed words are returned folded, as split at spaces", async () => {
    const search = await searchOf()
    expect(searchSite(search, "Red  DNS", 10)[0]?.terms).toEqual(["red", "dns"])
  })
})

describe("searchSite: ranking", () => {
  test("title beats body", async () => {
    const search = await searchOf()
    expect(titlesFor(search, "vlan")).toEqual(["VLAN", "Router"])
  })

  test("heading beats body", async () => {
    const search = await searchOf()
    const titles = titlesFor(search, "copias")
    expect(titles.indexOf("Plan")).toBeLessThan(titles.indexOf("Disco"))
  })

  test("exact beats approximate", async () => {
    const search = await searchOf({
      "docs/a.mdx": page("Uno", "La palabra cuenta aquí."),
      "docs/b.mdx": page("Dos", "La palabro cuenta aquí."),
    })
    expect(titlesFor(search, "palabra")).toEqual(["Uno", "Dos"])
  })

  test("at most the limit, the most relevant ones", async () => {
    const search = await searchOf()
    expect(searchSite(search, "vlan", 1).map((hit) => hit.title)).toEqual([
      "VLAN",
    ])
  })
})

describe("searchSite: excerpt and section", () => {
  test("a body match points at its section, with the word highlighted", async () => {
    const search = await searchOf()
    const hit = hitFor(search, "consulta", "DNS")
    expect(hit.anchor).toBe("resolución-inversa")
    expect(hit.excerpt?.text).toBe(
      "La consulta inversa devuelve el nombre de una IP."
    )
    expect(highlighted(hit)).toEqual(["consulta"])
  })

  test("a heading match points at that heading", async () => {
    const search = await searchOf()
    const hit = hitFor(search, "inversa", "DNS")
    expect(hit.anchor).toBe("resolución-inversa")
    expect(highlighted(hit)).toEqual(["inversa"])
  })

  test("a title match has no excerpt and no anchor", async () => {
    const search = await searchOf()
    const hit = hitFor(search, "dns", "DNS")
    expect(hit.excerpt).toBeNull()
    expect(hit.anchor).toBeNull()
  })

  test("a match above the first heading has an excerpt and no anchor", async () => {
    const search = await searchOf()
    const hit = hitFor(search, "servidor", "DNS")
    expect(hit.anchor).toBeNull()
    expect(highlighted(hit)).toEqual(["Servidor"])
  })

  test("a long text is cut at word boundaries with ellipses around the match", async () => {
    const search = await searchOf()
    const hit = hitFor(search, "configuracion", "Ajustes")
    const excerpt = hit.excerpt?.text ?? ""
    expect(excerpt.startsWith("…palabra")).toBe(true)
    expect(excerpt.endsWith("…")).toBe(true)
    expect(excerpt.length).toBeLessThanOrEqual(162)
    const words = excerpt.slice(1, -1).split(" ")
    const whole = new Set(`${LONG_TEXT} configuración`.split(" "))
    expect(words.every((word) => whole.has(word))).toBe(true)
    expect(highlighted(hit)).toEqual(["configuración"])
  })

  test("a typo highlights the word the page holds", async () => {
    const search = await searchOf()
    expect(highlighted(hitFor(search, "confguracion", "Ajustes"))).toEqual([
      "configuración",
    ])
  })
})
