import { describe, expect, test } from "bun:test"
import type { CallToolResult } from "@modelcontextprotocol/server"
import { ORPCError } from "@orpc/server"
import type { z } from "zod"
import { withOrigin } from "#v1/docs/full-links"
import type { DocsRepository } from "#v1/docs/llm-text"
import { llmsIndex, repositoryLlmsIndex } from "#v1/docs/llm-text"
import { pageMarkdown } from "#v1/docs/markdown"
import type { docsOutput } from "#v1/docs/output"
import {
  type DocsClient,
  indexTool,
  parseRoute,
  readTool,
  repositoriesTool,
  searchTool,
} from "#v1/mcp/tools"

const origin = "https://docs.example.org"

type Page = z.infer<typeof docsOutput.page>
type SearchOutput = z.infer<typeof docsOutput.search>

function entry(slug: string, path: string, title: string, description = "") {
  return { path, href: `/${slug}/${path}`, title, description, icon: null }
}

const casa: DocsRepository = {
  slug: "casa",
  name: "Casa",
  title: "Homelab",
  description: "Lo que corre en casa",
  available: true,
  home: { ...entry("casa", "", "Inicio", "Portada"), href: "/casa" },
  nodes: [
    {
      kind: "section",
      ...entry("casa", "red", "Red"),
      children: [
        {
          kind: "page",
          ...entry("casa", "red/dns", "DNS", "Resolución de nombres"),
        },
      ],
    },
  ],
}

const nuevo: DocsRepository = {
  slug: "nuevo",
  name: "Nuevo",
  title: null,
  description: null,
  available: false,
  home: null,
  nodes: [],
}

const dns: Page = {
  repository: { slug: "casa", name: "Casa" },
  path: "red/dns",
  href: "/casa/red/dns",
  source: "file",
  header: {
    title: "DNS",
    description: "Resolución de nombres",
    icon: null,
    updated: null,
    edited: null,
    fields: [],
  },
  tree: {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "p",
        properties: {},
        children: [
          { type: "text", value: "Ver " },
          {
            type: "element",
            tagName: "a",
            properties: { href: "/casa/red/vpn" },
            children: [{ type: "text", value: "la VPN" }],
          },
        ],
      },
    ],
  },
  headings: [],
  breadcrumbs: [{ path: "red", href: "/casa/red", title: "Red" }],
  previous: null,
  next: null,
  children: [],
  hasProblems: false,
  problems: [],
  styles: null,
}

const noResults: SearchOutput = { allRepositories: false, results: [] }

type Calls = { page: unknown[]; search: unknown[] }

/** A `v1.docs` client answering from fixtures, recording what it was asked. */
function fakeDocs({
  repositories = [casa, nuevo],
  search = noResults,
}: {
  repositories?: DocsRepository[]
  search?: SearchOutput
} = {}): { docs: DocsClient; calls: Calls } {
  const calls: Calls = { page: [], search: [] }
  const docs: DocsClient = {
    nav: async () => ({ repositories }),
    page: async (input) => {
      calls.page.push(input)
      if (input.repository === "casa" && input.path === "red/dns") return dns
      throw new ORPCError("NOT_FOUND")
    },
    search: async (input) => {
      calls.search.push(input)
      return search
    },
  }
  return { docs, calls }
}

function text(result: CallToolResult): string {
  const [first] = result.content
  if (first?.type !== "text") throw new Error("No text content")
  return first.text
}

describe("parseRoute", () => {
  test("splits a reader route into the repository and the page", () => {
    expect(parseRoute("/casa/red/dns")).toEqual({
      repository: "casa",
      path: "red/dns",
    })
  })

  test("a repository alone is its home", () => {
    expect(parseRoute("/casa")).toEqual({ repository: "casa", path: "" })
    expect(parseRoute("casa/")).toEqual({ repository: "casa", path: "" })
  })

  test("drops the section, the query, the trailing slash and /llm.txt", () => {
    for (const route of [
      "/casa/red/dns#resolucion-inversa",
      "/casa/red/dns?x=1",
      "/casa/red/dns/",
      "/casa/red/dns/llm.txt",
      " /casa/red/dns ",
    ])
      expect(parseRoute(route)).toEqual({ repository: "casa", path: "red/dns" })
  })

  test("takes the path of a full address", () => {
    expect(
      parseRoute("https://docs.example.org/casa/red/dns/llm.txt#x")
    ).toEqual({ repository: "casa", path: "red/dns" })
  })

  test("decodes escaped characters", () => {
    expect(parseRoute("https://docs.example.org/casa/m%C3%A1quinas")).toEqual({
      repository: "casa",
      path: "máquinas",
    })
  })

  test("names no repository for the root or a broken escape", () => {
    expect(parseRoute("/")).toBeNull()
    expect(parseRoute("")).toBeNull()
    expect(parseRoute("/casa/%E0%A4%A")).toBeNull()
  })
})

describe("repositoriesTool", () => {
  test("lists every repository, with its index when it has content", async () => {
    const { docs } = fakeDocs()
    const result = await repositoriesTool({ docs, origin })
    expect(result.isError).toBeUndefined()
    expect(text(result)).toBe(
      [
        "- `casa`: Casa, Lo que corre en casa. Index: https://docs.example.org/casa/llms.txt",
        "- `nuevo`: Nuevo (no content yet)",
      ].join("\n")
    )
    expect(result.structuredContent).toEqual({
      repositories: [
        {
          slug: "casa",
          name: "Casa",
          description: "Lo que corre en casa",
          available: true,
          index: "https://docs.example.org/casa/llms.txt",
        },
        {
          slug: "nuevo",
          name: "Nuevo",
          description: null,
          available: false,
          index: null,
        },
      ],
    })
  })

  test("says so when there is none", async () => {
    const { docs } = fakeDocs({ repositories: [] })
    const result = await repositoriesTool({ docs, origin })
    expect(text(result)).toBe("There are no documentation repositories.")
    expect(result.structuredContent).toEqual({ repositories: [] })
  })
})

describe("indexTool", () => {
  test("without a repository is the global llms.txt", async () => {
    const { docs } = fakeDocs()
    const result = await indexTool({ docs, origin, input: {} })
    expect(text(result)).toBe(llmsIndex([casa, nuevo], origin))
  })

  test("with a repository is its llms.txt", async () => {
    const { docs } = fakeDocs()
    const result = await indexTool({
      docs,
      origin,
      input: { repository: "casa" },
    })
    expect(text(result)).toBe(repositoryLlmsIndex(casa, origin))
  })

  test("an unknown repository or one without content is an error", async () => {
    const { docs } = fakeDocs()
    for (const repository of ["no-existe", "nuevo"]) {
      const result = await indexTool({ docs, origin, input: { repository } })
      expect(result.isError).toBe(true)
      expect(text(result)).toContain(`"${repository}" does not exist`)
    }
  })
})

describe("searchTool", () => {
  const found: SearchOutput = {
    allRepositories: true,
    results: [
      {
        repository: { slug: "casa", name: "Casa" },
        path: "red/dns",
        href: "/casa/red/dns#resolucion-inversa",
        title: "DNS",
        description: "Resolución de nombres",
        trail: ["Red"],
        excerpt: {
          text: "…la resolución inversa…",
          highlights: [{ start: 15, end: 22 }],
        },
        terms: ["inversa"],
      },
      {
        repository: { slug: "trabajo", name: "Trabajo" },
        path: "correo",
        href: "/trabajo/correo",
        title: "Correo",
        description: "",
        trail: [],
        excerpt: null,
        terms: ["inversa"],
      },
    ],
  }

  test("passes the query through and lists the results with their routes", async () => {
    const { docs, calls } = fakeDocs({ search: found })
    const input = { query: "inversa", repository: undefined, limit: 10 }
    const result = await searchTool({ docs, origin, input })
    expect(calls.search).toEqual([input])
    expect(text(result)).toBe(
      [
        '2 results for "inversa". Pass a route to read for the whole page.',
        "",
        "- **Red / DNS**: `/casa/red/dns#resolucion-inversa`",
        "  Repository: Casa",
        "  Resolución de nombres",
        "  > …la resolución inversa…",
        "- **Correo**: `/trabajo/correo`",
        "  Repository: Trabajo",
      ].join("\n")
    )
    expect(result.structuredContent).toEqual({
      results: [
        {
          repository: { slug: "casa", name: "Casa" },
          route: "/casa/red/dns#resolucion-inversa",
          title: "DNS",
          description: "Resolución de nombres",
          trail: ["Red"],
          excerpt: "…la resolución inversa…",
        },
        {
          repository: { slug: "trabajo", name: "Trabajo" },
          route: "/trabajo/correo",
          title: "Correo",
          description: "",
          trail: [],
          excerpt: null,
        },
      ],
    })
  })

  test("leaves the repository out when only one was searched", async () => {
    const { docs } = fakeDocs({
      search: { ...found, allRepositories: false },
    })
    const result = await searchTool({
      docs,
      origin,
      input: { query: "inversa", repository: "casa", limit: 10 },
    })
    expect(text(result)).not.toContain("Repository:")
  })

  test("an unknown repository or one without content is an error, not a search everywhere", async () => {
    const { docs, calls } = fakeDocs({ search: found })
    for (const repository of ["no-existe", "nuevo"]) {
      const result = await searchTool({
        docs,
        origin,
        input: { query: "inversa", repository, limit: 10 },
      })
      expect(result.isError).toBe(true)
      expect(text(result)).toContain(`"${repository}" does not exist`)
    }
    expect(calls.search).toEqual([])
  })

  test("says so when nothing matches, without an error", async () => {
    const { docs } = fakeDocs()
    const result = await searchTool({
      docs,
      origin,
      input: { query: "zzz", repository: undefined, limit: 10 },
    })
    expect(result.isError).toBeUndefined()
    expect(text(result)).toBe('No page matches "zzz".')
    expect(result.structuredContent).toEqual({ results: [] })
  })
})

describe("readTool", () => {
  test("is the page's llm.txt text under a line saying where it is", async () => {
    const { docs, calls } = fakeDocs()
    const result = await readTool({
      docs,
      origin,
      input: { route: "/casa/red/dns#resolucion-inversa" },
    })
    expect(calls.page).toEqual([{ repository: "casa", path: "red/dns" }])
    const expected = withOrigin(
      pageMarkdown({
        title: dns.header.title,
        description: dns.header.description,
        tree: dns.tree,
      }),
      origin
    )
    expect(text(result)).toBe(
      `Location: Casa / Red / DNS (https://docs.example.org/casa/red/dns)\n\n${expected}`
    )
    expect(text(result)).toContain("(https://docs.example.org/casa/red/vpn)")
  })

  test("a missing page is an error, not a failure", async () => {
    const { docs } = fakeDocs()
    const result = await readTool({
      docs,
      origin,
      input: { route: "/casa/no-existe" },
    })
    expect(result.isError).toBe(true)
    expect(text(result)).toContain('There is no page at "/casa/no-existe"')
  })

  test("a route the reader rejects is an error too", async () => {
    const { docs } = fakeDocs()
    docs.page = async () => {
      throw new ORPCError("BAD_REQUEST")
    }
    const result = await readTool({ docs, origin, input: { route: "/X/.." } })
    expect(result.isError).toBe(true)
  })

  test("something that is not a route never reaches the reader", async () => {
    const { docs, calls } = fakeDocs()
    const result = await readTool({ docs, origin, input: { route: "/" } })
    expect(result.isError).toBe(true)
    expect(text(result)).toContain("is not a documentation route")
    expect(calls.page).toEqual([])
  })

  test("other failures are not hidden", async () => {
    const { docs } = fakeDocs()
    docs.page = async () => {
      throw new ORPCError("INTERNAL_SERVER_ERROR")
    }
    await expect(
      readTool({ docs, origin, input: { route: "/casa/red/dns" } })
    ).rejects.toBeInstanceOf(ORPCError)
  })
})
