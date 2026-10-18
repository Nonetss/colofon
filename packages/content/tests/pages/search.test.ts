import { describe, expect, test } from "bun:test"
import {
  createDocsSearch,
  type DocsSearch,
  type SearchAnswer,
  type SearchHit,
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

/** A catalog type with a label field and three entities. */
const SERVICES = {
  "catalog/servicios/_type.yaml": [
    "name: Servicio",
    "plural: Servicios",
    "title_field: name",
    "fields:",
    "  name: { type: text }",
    "  nota: { type: text, optional: true }",
  ].join("\n"),
  "catalog/servicios/database-url.yaml": "name: DATABASE_URL\n",
  "catalog/servicios/proxy.yaml": "name: Proxy\n",
  "catalog/servicios/web.yaml": "name: Web\nnota: Va detrás del proxy\n",
}

const CASA = new Set(["casa"])

async function searchOf(files: Record<string, string> = SITE) {
  const search = createDocsSearch()
  search.update("casa", await siteOf(files))
  return search
}

function answerFor(
  search: DocsSearch,
  query: string,
  limit = 20,
  repositories: ReadonlySet<string> = CASA
): SearchAnswer {
  return search.search(query, { repositories, limit, entityLimit: 5 })
}

function titlesFor(search: DocsSearch, query: string): string[] {
  return answerFor(search, query).hits.map((hit) => hit.title)
}

function hitFor(search: DocsSearch, query: string, title: string): SearchHit {
  const found = answerFor(search, query).hits.find((hit) => hit.title === title)
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

describe("docsSearch: what is indexed", () => {
  test("a word only in the body finds the page", async () => {
    const search = await searchOf()
    expect(titlesFor(search, "inversa")).toEqual(["DNS"])
  })

  test("updating a repository with a new site replaces its pages", async () => {
    const search = await searchOf()
    expect(titlesFor(search, "pihole")).toEqual([])
    search.update(
      "casa",
      await siteOf({
        ...SITE,
        "docs/red/dns.mdx": page("DNS", "Ahora con pihole."),
      })
    )
    expect(titlesFor(search, "pihole")).toEqual(["DNS"])
    expect(titlesFor(search, "inversa")).toEqual([])
    expect(titlesFor(search, "vlan")).toEqual(["VLAN", "Router"])
  })

  test("updating a repository with the same site indexes nothing twice", async () => {
    const site = await siteOf(SITE)
    const search = createDocsSearch()
    search.update("casa", site)
    search.update("casa", site)
    expect(titlesFor(search, "vlan")).toEqual(["VLAN", "Router"])
  })

  test("only the asked repositories are searched", async () => {
    const search = await searchOf()
    search.update(
      "otra",
      await siteOf({ "docs/index.mdx": page("Otra"), ...SERVICES })
    )
    search.update(
      "propia",
      await siteOf({ "docs/pihole.mdx": page("Pihole", "Mi pihole.") })
    )
    expect(titlesFor(search, "pihole")).toEqual([])
    const both = answerFor(search, "pihole", 20, new Set(["casa", "propia"]))
    expect(both.hits.map((hit) => hit.repository)).toEqual(["propia"])
    expect(answerFor(search, "proxy").entities).toEqual([])
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

describe("docsSearch: matching", () => {
  test("accents and case are ignored", async () => {
    const search = await searchOf()
    expect(titlesFor(search, "RESOLUCION")).toEqual(["DNS"])
  })

  test("every word must be found", async () => {
    const search = await searchOf()
    const answer = answerFor(search, "router vlan")
    expect(answer.hits.map((hit) => hit.title)).toEqual(["Router"])
    expect(answer.partial).toBe(false)
    expect(answer.hits[0]?.missing).toEqual([])
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
    expect(answerFor(search, "  ¿? ", 10)).toEqual({
      partial: false,
      hits: [],
      entities: [],
    })
  })

  test("the typed words are returned folded, as split at spaces", async () => {
    const search = await searchOf()
    expect(answerFor(search, "Red  DNS", 10).hits[0]?.terms).toEqual([
      "red",
      "dns",
    ])
  })
})

describe("docsSearch: ranking", () => {
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
    expect(answerFor(search, "vlan", 1).hits.map((hit) => hit.title)).toEqual([
      "VLAN",
    ])
  })

  test("repository size does not bias the ranking", async () => {
    const notes = page("Notas", "Aquí va el proxy de la casa.")
    const many = Object.fromEntries(
      Array.from({ length: 50 }, (_, i) => [
        `docs/tema${i}.mdx`,
        page(`Tema ${i}`, `Texto del tema ${i}.`),
      ])
    )
    const search = createDocsSearch()
    search.update("mini", await siteOf({ "docs/notas.mdx": notes }))
    search.update("grande", await siteOf({ ...many, "docs/notas.mdx": notes }))
    const { hits } = answerFor(search, "proxy", 20, new Set(["mini", "grande"]))
    expect(hits.map((hit) => hit.repository)).toEqual(["grande", "mini"])
    expect(hits[0]?.score).toBe(hits[1]?.score ?? 0)
  })

  test("the scope does not change the order of a repository's pages", async () => {
    const search = await searchOf()
    search.update(
      "otra",
      await siteOf({ "docs/vlan.mdx": page("VLAN", "Otra vlan.") })
    )
    const alone = titlesFor(search, "vlan")
    const together = answerFor(search, "vlan", 20, new Set(["casa", "otra"]))
      .hits.filter((hit) => hit.repository === "casa")
      .map((hit) => hit.title)
    expect(together).toEqual(alone)
  })
})

describe("docsSearch: excerpt and section", () => {
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

describe("docsSearch: partial answers", () => {
  const files = {
    "docs/uno.mdx": page("Uno", "El router lleva la vlan."),
    "docs/dos.mdx": page("Dos", "Solo el router."),
  }

  test("pages holding some words come back, those lacking fewer first", async () => {
    const search = await searchOf(files)
    const answer = answerFor(search, "router vlan zigbee")
    expect(answer.partial).toBe(true)
    expect(answer.hits.map((hit) => [hit.title, hit.missing])).toEqual([
      ["Uno", ["zigbee"]],
      ["Dos", ["vlan", "zigbee"]],
    ])
  })

  test("one unknown word finds nothing and is not partial", async () => {
    const search = await searchOf(files)
    expect(answerFor(search, "zigbee")).toEqual({
      partial: false,
      hits: [],
      entities: [],
    })
  })

  test("a title match in a partial answer needs no excerpt", async () => {
    const search = await searchOf(files)
    const hit = hitFor(search, "uno zigbee", "Uno")
    expect(hit.excerpt).toBeNull()
    expect(hit.missing).toEqual(["zigbee"])
  })
})

describe("docsSearch: extra sections", () => {
  const files = {
    "docs/dns.mdx": page(
      "DNS",
      [
        "## Resolución inversa",
        "",
        "Usa la caché del servidor.",
        "",
        "## Cachés",
        "",
        "La caché guarda cada ttl.",
        "",
        "## Rendimiento",
        "",
        "Una caché caliente responde antes.",
      ].join("\n")
    ),
  }

  test("the best section gives the excerpt and the next ones follow", async () => {
    const search = await searchOf(files)
    const hit = hitFor(search, "caché ttl", "DNS")
    expect(hit.anchor).toBe("cachés")
    expect(highlighted(hit)).toEqual(["caché", "ttl"])
    expect(hit.sections.map((section) => section.anchor)).toEqual([
      "resolución-inversa",
      "rendimiento",
    ])
    expect(hit.sections[1]?.heading).toBe("Rendimiento")
    expect(hit.sections[1]?.excerpt.text).toBe(
      "Una caché caliente responde antes."
    )
  })

  test("one matching section brings no extra sections", async () => {
    const search = await searchOf(files)
    expect(hitFor(search, "ttl", "DNS").sections).toEqual([])
  })

  test("a title match brings no extra sections", async () => {
    const search = await searchOf(files)
    expect(hitFor(search, "dns", "DNS").sections).toEqual([])
  })
})

describe("docsSearch: entities", () => {
  test("an identifier finds its entity first, as exact", async () => {
    const search = await searchOf({ ...SITE, ...SERVICES })
    const [first] = answerFor(search, "DATABASE_URL").entities
    expect(first).toEqual({
      repository: "casa",
      type: { id: "servicios", plural: "Servicios" },
      id: "database-url",
      label: "DATABASE_URL",
      path: "catalog/servicios/database-url",
      exact: true,
      score: first?.score ?? 0,
    })
  })

  test("a field value finds an entity", async () => {
    const search = await searchOf()
    const entities = answerFor(search, "192.168.1.30").entities
    expect(entities.map((entity) => entity.id)).toEqual(["nas"])
    expect(entities[0]?.exact).toBe(false)
  })

  test("an exact label beats a mention in a field", async () => {
    const search = await searchOf({ ...SITE, ...SERVICES })
    const entities = answerFor(search, "proxy").entities
    expect(entities.map((entity) => [entity.label, entity.exact])).toEqual([
      ["Proxy", true],
      ["Web", false],
    ])
  })

  test("entities need every word, even when pages are partial", async () => {
    const search = await searchOf({ ...SITE, ...SERVICES })
    const answer = answerFor(search, "proxy router")
    expect(answer.partial).toBe(true)
    expect(answer.entities).toEqual([])
  })

  test("at most the entity limit", async () => {
    const search = await searchOf({ ...SITE, ...SERVICES })
    const answer = search.search("servicios", {
      repositories: CASA,
      limit: 10,
      entityLimit: 2,
    })
    expect(answer.entities).toHaveLength(2)
  })
})
