import { describe, expect, test } from "bun:test"
import {
  type DocsSearchAnswer,
  docSearchEntries,
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
    terms: ["consulta"],
    ...overrides,
  }
}

describe("docSearchEntries", () => {
  test("keeps the server's order and maps each page with its route, keywords and excerpt", () => {
    const entries = docSearchEntries({
      allRepositories: false,
      results: [result(), result({ title: "VPN", href: "/casa/red/vpn" })],
    })
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
    })
  })

  test("a page without an excerpt has none", () => {
    const [entry] = docSearchEntries({
      allRepositories: false,
      results: [result({ excerpt: null })],
    })
    expect(entry?.excerpt).toBeUndefined()
  })

  test("with several repositories searched, the trail starts with the repository", () => {
    const [entry] = docSearchEntries({
      allRepositories: true,
      results: [result()],
    })
    expect(entry?.trail).toEqual(["Casa", "Red"])
  })
})
