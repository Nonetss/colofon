import { describe, expect, test } from "bun:test"
import {
  type DocsSearchAnswer,
  type DocsSearchEntity,
  docSearchEntries,
  docSearchMeta,
} from "@/features/app-shell/authenticated/model/doc-search-entries"

type DocsSearchResult = DocsSearchAnswer["results"][number]

function result(overrides: Partial<DocsSearchResult> = {}): DocsSearchResult {
  return {
    repository: { slug: "casa", name: "Casa" },
    path: "red/dns",
    href: "/casa/red/dns#resolución-inversa",
    title: "DNS",
    description: "Nombres",
    trail: ["Red"],
    excerpt: {
      text: "La consulta inversa",
      highlights: [{ start: 3, end: 11 }],
    },
    sections: [],
    terms: ["consulta"],
    missing: [],
    ...overrides,
  }
}

function entity(overrides: Partial<DocsSearchEntity> = {}): DocsSearchEntity {
  return {
    repository: { slug: "casa", name: "Casa" },
    type: { id: "maquinas", plural: "Máquinas" },
    id: "nas",
    label: "NAS",
    href: "/casa/catalog/maquinas/nas",
    exact: false,
    ...overrides,
  }
}

/** An answer of one repository with `results` and nothing else. */
function answer(overrides: Partial<DocsSearchAnswer> = {}): DocsSearchAnswer {
  return {
    allRepositories: false,
    partial: false,
    results: [],
    entities: [],
    ...overrides,
  }
}

describe("docSearchEntries", () => {
  test("keeps the server's order and maps each page with its route, keywords and excerpt", () => {
    const entries = docSearchEntries(
      answer({
        results: [result(), result({ title: "VPN", href: "/casa/red/vpn" })],
      })
    )
    expect(entries.map((entry) => entry.label)).toEqual(["DNS", "VPN"])
    expect(entries[0]).toEqual({
      params: {},
      href: "/casa/red/dns#resolución-inversa",
      trail: ["Red"],
      label: "DNS",
      description: "Nombres",
      keywords: ["consulta"],
      excerpt: {
        text: "La consulta inversa",
        highlights: [{ start: 3, end: 11 }],
      },
      sections: [],
      missing: [],
    })
  })

  test("maps the extra sections and the missing words", () => {
    const [entry] = docSearchEntries(
      answer({
        partial: true,
        results: [
          result({
            missing: ["zigbee"],
            sections: [
              {
                heading: "Cachés",
                href: "/casa/red/dns#cachés",
                excerpt: { text: "La caché", highlights: [] },
              },
            ],
          }),
        ],
      })
    )
    expect(entry?.missing).toEqual(["zigbee"])
    expect(entry?.sections).toEqual([
      {
        href: "/casa/red/dns#cachés",
        label: "Cachés",
        excerpt: { text: "La caché", highlights: [] },
      },
    ])
  })

  test("a page without an excerpt has none", () => {
    const [entry] = docSearchEntries(
      answer({ results: [result({ excerpt: null })] })
    )
    expect(entry?.excerpt).toBeUndefined()
  })

  test("with several repositories searched, the trail starts with the repository", () => {
    const [entry] = docSearchEntries(
      answer({ allRepositories: true, results: [result()] })
    )
    expect(entry?.trail).toEqual(["Casa", "Red"])
  })
})

describe("docSearchMeta", () => {
  test("keeps the partial flag and the entities in the server's order", () => {
    const entities = [entity(), entity({ id: "router", label: "Router" })]
    expect(docSearchMeta(answer({ partial: true, entities }))).toEqual({
      allRepositories: false,
      partial: true,
      entities,
      entitiesFirst: false,
    })
  })

  test("the catalog goes first only with an exact entity", () => {
    const meta = docSearchMeta(
      answer({ entities: [entity(), entity({ id: "x", exact: true })] })
    )
    expect(meta.entitiesFirst).toBe(true)
    expect(docSearchMeta(answer()).entitiesFirst).toBe(false)
  })
})
