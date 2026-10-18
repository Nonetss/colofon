import { describe, expect, test } from "bun:test"
import { ORPCError } from "@orpc/server"
import {
  casa,
  casaDeploy,
  colofon,
  dns,
  fakeDocs,
  heading,
  noResults,
  nuevo,
  origin,
  type Page,
  type SearchOutput,
  sections,
  text,
} from "#tests/v1/mcp/tools/helpers"
import { withOrigin } from "#v1/docs/full-links"
import { llmsIndex, repositoryLlmsIndex } from "#v1/docs/llm-text"
import { bodyMarkdown, pageMarkdown } from "#v1/docs/markdown"
import {
  entityTool,
  indexTool,
  parseRoute,
  readTool,
  repositoriesTool,
  searchTool,
} from "#v1/mcp/tools/docs"

describe("parseRoute", () => {
  test("splits a reader route into the repository and the page", () => {
    expect(parseRoute("/casa/red/dns")).toEqual({
      repository: "casa",
      path: "red/dns",
      section: null,
    })
  })

  test("a repository alone is its home", () => {
    const home = { repository: "casa", path: "", section: null }
    expect(parseRoute("/casa")).toEqual(home)
    expect(parseRoute("casa/")).toEqual(home)
  })

  test("drops the query, the trailing slash and /llm.txt", () => {
    for (const route of [
      "/casa/red/dns?x=1",
      "/casa/red/dns/",
      "/casa/red/dns/llm.txt",
      " /casa/red/dns ",
      "/casa/red/dns#",
    ])
      expect(parseRoute(route)).toEqual({
        repository: "casa",
        path: "red/dns",
        section: null,
      })
  })

  test("keeps the section of a search result", () => {
    expect(parseRoute("/casa/red/dns#resolucion-inversa")).toEqual({
      repository: "casa",
      path: "red/dns",
      section: "resolucion-inversa",
    })
    expect(parseRoute("/casa/red/dns?x=1#ptr")).toEqual({
      repository: "casa",
      path: "red/dns",
      section: "ptr",
    })
  })

  test("takes the path and section of a full address", () => {
    expect(
      parseRoute("https://docs.example.org/casa/red/dns/llm.txt#x")
    ).toEqual({ repository: "casa", path: "red/dns", section: "x" })
  })

  test("decodes escaped characters, in the path and the section", () => {
    expect(
      parseRoute("https://docs.example.org/casa/m%C3%A1quinas#cach%C3%A9s")
    ).toEqual({ repository: "casa", path: "máquinas", section: "cachés" })
  })

  test("names no repository for the root or a broken escape", () => {
    expect(parseRoute("/")).toBeNull()
    expect(parseRoute("")).toBeNull()
    expect(parseRoute("/casa/%E0%A4%A")).toBeNull()
  })
})

describe("repositoriesTool", () => {
  test("lists every repository, with its index when it has content", async () => {
    const { docs, skills } = fakeDocs()
    const result = await repositoriesTool({ docs, skills, origin })
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
    const { docs, skills } = fakeDocs({ repositories: [] })
    const result = await repositoriesTool({ docs, skills, origin })
    expect(text(result)).toBe("There are no documentation repositories.")
    expect(result.structuredContent).toEqual({ repositories: [] })
  })
})

describe("indexTool", () => {
  test("without a repository is the global llms.txt", async () => {
    const { docs, skills } = fakeDocs()
    const result = await indexTool({ docs, skills, origin, input: {} })
    expect(text(result)).toBe(llmsIndex([casa, nuevo], [], origin))
  })

  test("with a repository is its llms.txt", async () => {
    const { docs, skills } = fakeDocs()
    const result = await indexTool({
      docs,
      skills,
      origin,
      input: { repository: "casa" },
    })
    expect(text(result)).toBe(repositoryLlmsIndex(casa, [], origin))
  })

  test("an unknown repository or one without content is an error", async () => {
    const { docs, skills } = fakeDocs()
    for (const repository of ["no-existe", "nuevo"]) {
      const result = await indexTool({
        docs,
        skills,
        origin,
        input: { repository },
      })
      expect(result.isError).toBe(true)
      expect(text(result)).toContain(`"${repository}" does not exist`)
    }
  })
})

describe("searchTool", () => {
  const found: SearchOutput = {
    allRepositories: true,
    partial: false,
    entities: [],
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
        sections: [],
        terms: ["inversa"],
        missing: [],
      },
      {
        repository: { slug: "trabajo", name: "Trabajo" },
        path: "correo",
        href: "/trabajo/correo",
        title: "Correo",
        description: "",
        trail: [],
        excerpt: null,
        sections: [],
        terms: ["inversa"],
        missing: [],
      },
    ],
  }

  test("passes the query through and lists the results with their routes", async () => {
    const { docs, skills, calls } = fakeDocs({ search: found })
    const input = { query: "inversa", repository: undefined, limit: 10 }
    const result = await searchTool({ docs, skills, origin, input })
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
      partial: false,
      results: [
        {
          repository: { slug: "casa", name: "Casa" },
          route: "/casa/red/dns#resolucion-inversa",
          title: "DNS",
          description: "Resolución de nombres",
          trail: ["Red"],
          excerpt: "…la resolución inversa…",
          missing: [],
          sections: [],
        },
        {
          repository: { slug: "trabajo", name: "Trabajo" },
          route: "/trabajo/correo",
          title: "Correo",
          description: "",
          trail: [],
          excerpt: null,
          missing: [],
          sections: [],
        },
      ],
      entities: [],
    })
  })

  test("leaves the repository out when only one was searched", async () => {
    const { docs, skills } = fakeDocs({
      search: { ...found, allRepositories: false },
    })
    const result = await searchTool({
      docs,
      skills,
      origin,
      input: { query: "inversa", repository: "casa", limit: 10 },
    })
    expect(text(result)).not.toContain("Repository:")
  })

  test("an unknown repository or one without content is an error, not a search everywhere", async () => {
    const { docs, skills, calls } = fakeDocs({ search: found })
    for (const repository of ["no-existe", "nuevo"]) {
      const result = await searchTool({
        docs,
        skills,
        origin,
        input: { query: "inversa", repository, limit: 10 },
      })
      expect(result.isError).toBe(true)
      expect(text(result)).toContain(`"${repository}" does not exist`)
    }
    expect(calls.search).toEqual([])
  })

  test("says so when nothing matches, without an error", async () => {
    const { docs, skills } = fakeDocs()
    const result = await searchTool({
      docs,
      skills,
      origin,
      input: { query: "zzz", repository: undefined, limit: 10 },
    })
    expect(result.isError).toBeUndefined()
    expect(text(result)).toBe('No page or catalog entity matches "zzz".')
    expect(result.structuredContent).toEqual({
      partial: false,
      results: [],
      entities: [],
    })
  })

  const dnsWithSections: SearchOutput["results"][number] = {
    repository: { slug: "casa", name: "Casa" },
    path: "red/dns",
    href: "/casa/red/dns#caches",
    title: "DNS",
    description: "",
    trail: ["Red"],
    excerpt: { text: "La caché guarda cada ttl.", highlights: [] },
    sections: [
      {
        heading: "Rendimiento",
        href: "/casa/red/dns#rendimiento",
        excerpt: { text: "Una caché caliente.", highlights: [] },
      },
    ],
    terms: ["cache", "ttl"],
    missing: [],
  }

  async function searchFor(query: string, search: SearchOutput) {
    const { docs, skills } = fakeDocs({ search })
    return searchTool({
      docs,
      skills,
      origin,
      input: { query, repository: undefined, limit: 10 },
    })
  }

  test("lists the extra sections under their page", async () => {
    const result = await searchFor("caché ttl", {
      ...noResults,
      results: [dnsWithSections],
    })
    expect(text(result)).toBe(
      [
        '1 results for "caché ttl". Pass a route to read for the whole page.',
        "",
        "- **Red / DNS**: `/casa/red/dns#caches`",
        "  > La caché guarda cada ttl.",
        "  Also in **Rendimiento**: `/casa/red/dns#rendimiento`",
        "    > Una caché caliente.",
      ].join("\n")
    )
  })

  test("says when the answer is partial and what each page lacks", async () => {
    const result = await searchFor("router zigbee", {
      ...noResults,
      partial: true,
      results: [
        {
          ...dnsWithSections,
          excerpt: null,
          sections: [],
          href: "/casa/red/dns",
          missing: ["zigbee"],
        },
      ],
    })
    expect(text(result)).toBe(
      [
        '1 results for "router zigbee". Pass a route to read for the whole page.',
        "No page holds every word; these hold some of them.",
        "",
        "- **Red / DNS**: `/casa/red/dns`",
        "  Missing words: zigbee",
      ].join("\n")
    )
    expect(result.structuredContent).toMatchObject({
      partial: true,
      results: [{ missing: ["zigbee"] }],
    })
  })

  test("lists the matching entities with the arguments for entity", async () => {
    const result = await searchFor("DATABASE_URL", {
      ...noResults,
      entities: [
        {
          repository: { slug: "colofon", name: "Colofon" },
          type: { id: "env-vars", plural: "Variables de entorno" },
          id: "database-url",
          label: "DATABASE_URL",
          href: "/colofon/catalog/env-vars/database-url",
          exact: true,
        },
      ],
    })
    expect(text(result)).toBe(
      [
        'No page matches "DATABASE_URL".',
        "",
        "Catalog entities (pass repository, type and id to entity):",
        "- **DATABASE_URL** (Variables de entorno, Colofon): repository `colofon`, type `env-vars`, id `database-url`",
      ].join("\n")
    )
    expect(result.structuredContent).toEqual({
      partial: false,
      results: [],
      entities: [
        {
          repository: { slug: "colofon", name: "Colofon" },
          type: { id: "env-vars", plural: "Variables de entorno" },
          id: "database-url",
          label: "DATABASE_URL",
          route: "/colofon/catalog/env-vars/database-url",
        },
      ],
    })
  })
})

describe("readTool", () => {
  test("is the page's llm.txt text under a line saying where it is", async () => {
    const { docs, skills, calls } = fakeDocs()
    const result = await readTool({
      docs,
      skills,
      origin,
      input: { route: "/casa/red/dns" },
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

  test("with a section, is only that section and its subsections", async () => {
    const { docs, skills, calls } = fakeDocs({
      pages: new Map([["red/dns", sections]]),
    })
    const result = await readTool({
      docs,
      skills,
      origin,
      input: { route: "/casa/red/dns#resolucion-inversa" },
    })
    expect(calls.page).toEqual([{ repository: "casa", path: "red/dns" }])
    expect(text(result)).toBe(
      [
        "Location: Casa / Red / DNS / Resolución inversa (https://docs.example.org/casa/red/dns#resolucion-inversa)",
        "",
        "## Resolución inversa",
        "",
        "Inversa.",
        "",
        "### PTR",
        "",
        "Registros PTR.",
        "",
        "### Zonas",
        "",
        "Zonas inversas.",
        "",
      ].join("\n")
    )
  })

  test("a level 3 section stops at the next heading of its level", async () => {
    const { docs, skills } = fakeDocs({
      pages: new Map([["red/dns", sections]]),
    })
    const result = await readTool({
      docs,
      skills,
      origin,
      input: { route: "/casa/red/dns#ptr" },
    })
    expect(text(result)).toContain("### PTR\n\nRegistros PTR.\n")
    expect(text(result)).not.toContain("Zonas")
    expect(text(result)).not.toContain("# DNS")
  })

  test("an unknown section is an error listing the page's sections", async () => {
    const { docs, skills } = fakeDocs({
      pages: new Map([["red/dns", sections]]),
    })
    const result = await readTool({
      docs,
      skills,
      origin,
      input: { route: "/casa/red/dns#no-existe" },
    })
    expect(result.isError).toBe(true)
    expect(text(result)).toBe(
      [
        'The page /casa/red/dns has no section "#no-existe". Its sections:',
        "- `#resolucion-inversa`: Resolución inversa",
        "- `#ptr`: PTR",
        "- `#zonas`: Zonas",
        "- `#caches`: Cachés",
        "- `#anidada`: Anidada",
        "Read /casa/red/dns for the whole page.",
      ].join("\n")
    )
  })

  test("a section of a page without sections is an error too", async () => {
    const { docs, skills } = fakeDocs()
    const result = await readTool({
      docs,
      skills,
      origin,
      input: { route: "/casa/red/dns#x" },
    })
    expect(result.isError).toBe(true)
    expect(text(result)).toContain("Read /casa/red/dns for the whole page.")
  })

  test("a section nested in another element gives the whole page", async () => {
    const { docs, skills } = fakeDocs({
      pages: new Map([["red/dns", sections]]),
    })
    const nested = await readTool({
      docs,
      skills,
      origin,
      input: { route: "/casa/red/dns#anidada" },
    })
    const whole = await readTool({
      docs,
      skills,
      origin,
      input: { route: "/casa/red/dns" },
    })
    expect(nested.isError).toBeUndefined()
    expect(text(nested)).toBe(text(whole))
  })

  test("a section's links are full addresses", async () => {
    const linked: Page = {
      ...sections,
      tree: {
        type: "root",
        children: [
          heading("h2", "vpn", "VPN"),
          {
            type: "element",
            tagName: "p",
            properties: {},
            children: [
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
      headings: [{ depth: 2, id: "vpn", text: "VPN" }],
    }
    const { docs, skills } = fakeDocs({ pages: new Map([["red/dns", linked]]) })
    const result = await readTool({
      docs,
      skills,
      origin,
      input: { route: "/casa/red/dns#vpn" },
    })
    const tree = linked.tree
    if (tree === null) throw new Error("No tree")
    expect(text(result)).toContain(
      withOrigin(`${bodyMarkdown(tree)}\n`, origin)
    )
    expect(text(result)).toContain("(https://docs.example.org/casa/red/vpn)")
  })

  test("a missing page is an error, not a failure", async () => {
    const { docs, skills } = fakeDocs()
    const result = await readTool({
      docs,
      skills,
      origin,
      input: { route: "/casa/no-existe" },
    })
    expect(result.isError).toBe(true)
    expect(text(result)).toContain('There is no page at "/casa/no-existe"')
  })

  test("a route the reader rejects is an error too", async () => {
    const { docs, skills } = fakeDocs()
    docs.page = async () => {
      throw new ORPCError("BAD_REQUEST")
    }
    const result = await readTool({
      docs,
      skills,
      origin,
      input: { route: "/X/.." },
    })
    expect(result.isError).toBe(true)
  })

  test("something that is not a route never reaches the reader", async () => {
    const { docs, skills, calls } = fakeDocs()
    const result = await readTool({
      docs,
      skills,
      origin,
      input: { route: "/" },
    })
    expect(result.isError).toBe(true)
    expect(text(result)).toContain("is not a documentation route")
    expect(calls.page).toEqual([])
  })

  test("other failures are not hidden", async () => {
    const { docs, skills } = fakeDocs()
    docs.page = async () => {
      throw new ORPCError("INTERNAL_SERVER_ERROR")
    }
    await expect(
      readTool({ docs, skills, origin, input: { route: "/casa/red/dns" } })
    ).rejects.toBeInstanceOf(ORPCError)
  })
})

describe("entityTool", () => {
  const input = { repository: "casa", type: "servidor", id: "nas" }

  test("is its catalog page, as read returns it", async () => {
    const { docs, skills, calls } = fakeDocs()
    const result = await entityTool({ docs, skills, origin, input })
    expect(calls.page).toEqual([
      { repository: "casa", path: "catalog/servidor/nas" },
    ])
    const read = await readTool({
      docs,
      skills,
      origin,
      input: { route: "/casa/catalog/servidor/nas" },
    })
    expect(result.isError).toBeUndefined()
    expect(text(result)).toBe(text(read))
    expect(text(result)).toStartWith(
      "Location: Casa / Catálogo / Servidores / NAS (https://docs.example.org/casa/catalog/servidor/nas)"
    )
    expect(text(result)).toContain("(https://docs.example.org/casa/copias)")
  })

  test("an unknown id points at its type's catalog page", async () => {
    const { docs, skills } = fakeDocs()
    const result = await entityTool({
      docs,
      skills,
      origin,
      input: { ...input, id: "no-existe" },
    })
    expect(result.isError).toBe(true)
    expect(text(result)).toBe(
      'There is no entity "no-existe" of type "servidor" in "casa". Read /casa/catalog/servidor to list the entities of that type.'
    )
  })

  test("an unknown type points at the catalog", async () => {
    const { docs, skills } = fakeDocs()
    const result = await entityTool({
      docs,
      skills,
      origin,
      input: { ...input, type: "no-existe" },
    })
    expect(result.isError).toBe(true)
    expect(text(result)).toBe(
      'There is no catalog type "no-existe" in "casa". Read /casa/catalog to list the catalog types.'
    )
  })

  test("an unknown repository or one without content says so", async () => {
    const { docs, skills } = fakeDocs()
    for (const repository of ["no-existe", "nuevo"]) {
      const result = await entityTool({
        docs,
        skills,
        origin,
        input: { ...input, repository },
      })
      expect(result.isError).toBe(true)
      expect(text(result)).toContain(`"${repository}" does not exist`)
    }
  })

  test("other failures are not hidden", async () => {
    const { docs, skills } = fakeDocs()
    docs.page = async () => {
      throw new ORPCError("INTERNAL_SERVER_ERROR")
    }
    await expect(
      entityTool({ docs, skills, origin, input })
    ).rejects.toBeInstanceOf(ORPCError)
  })
})

describe("indexTool with skills", () => {
  test("is still /llms.txt, guide and repository skills included", async () => {
    const skillList = [colofon, casaDeploy]
    const { docs, skills } = fakeDocs({ skillList })
    const global = await indexTool({ docs, skills, origin, input: {} })
    expect(text(global)).toBe(llmsIndex([casa, nuevo], skillList, origin))
    const one = await indexTool({
      docs,
      skills,
      origin,
      input: { repository: "casa" },
    })
    expect(text(one)).toBe(repositoryLlmsIndex(casa, skillList, origin))
    expect(text(one)).toContain("[casa-deploy]")
  })
})
