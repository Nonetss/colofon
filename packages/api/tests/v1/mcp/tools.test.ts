import { describe, expect, test } from "bun:test"
import type { CallToolResult } from "@modelcontextprotocol/server"
import { ORPCError } from "@orpc/server"
import type { z } from "zod"
import { withOrigin } from "#v1/docs/full-links"
import type { DocsRepository, DocsSkill } from "#v1/docs/llm-text"
import { llmsIndex, repositoryLlmsIndex } from "#v1/docs/llm-text"
import { bodyMarkdown, pageMarkdown } from "#v1/docs/markdown"
import type { docsOutput } from "#v1/docs/output"
import {
  type DocsClient,
  entityTool,
  indexTool,
  parseRoute,
  readTool,
  repositoriesTool,
  type SkillsClient,
  searchTool,
  skillsTool,
  skillTool,
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

type Node = NonNullable<Page["tree"]>["children"][number]

function heading(tagName: "h2" | "h3", id: string, value: string): Node {
  return {
    type: "element",
    tagName,
    properties: { id },
    children: [{ type: "text", value }],
  }
}

function paragraph(value: string): Node {
  return {
    type: "element",
    tagName: "p",
    properties: {},
    children: [{ type: "text", value }],
  }
}

/** `red/dns` with sections: "Resolución inversa" (with "PTR"), "Cachés". */
const sections: Page = {
  ...dns,
  tree: {
    type: "root",
    children: [
      paragraph("Intro."),
      heading("h2", "resolucion-inversa", "Resolución inversa"),
      paragraph("Inversa."),
      heading("h3", "ptr", "PTR"),
      paragraph("Registros PTR."),
      heading("h3", "zonas", "Zonas"),
      paragraph("Zonas inversas."),
      heading("h2", "caches", "Cachés"),
      paragraph("Cachés."),
      {
        type: "element",
        tagName: "div",
        properties: {},
        children: [heading("h3", "anidada", "Anidada")],
      },
    ],
  },
  headings: [
    { depth: 2, id: "resolucion-inversa", text: "Resolución inversa" },
    { depth: 3, id: "ptr", text: "PTR" },
    { depth: 3, id: "zonas", text: "Zonas" },
    { depth: 2, id: "caches", text: "Cachés" },
    { depth: 3, id: "anidada", text: "Anidada" },
  ],
}

/** The generated page of the entity `servidor/nas`. */
const nas: Page = {
  ...dns,
  path: "catalog/servidor/nas",
  href: "/casa/catalog/servidor/nas",
  source: "generated",
  header: { ...dns.header, title: "NAS", description: "Servidor" },
  tree: {
    type: "root",
    children: [
      heading("h2", "paginas-que-la-citan", "Páginas que la citan"),
      {
        type: "element",
        tagName: "ul",
        properties: {},
        children: [
          {
            type: "element",
            tagName: "li",
            properties: {},
            children: [
              {
                type: "element",
                tagName: "a",
                properties: { href: "/casa/copias" },
                children: [{ type: "text", value: "Copias" }],
              },
            ],
          },
        ],
      },
    ],
  },
  breadcrumbs: [
    { path: "catalog", href: "/casa/catalog", title: "Catálogo" },
    {
      path: "catalog/servidor",
      href: "/casa/catalog/servidor",
      title: "Servidores",
    },
  ],
}

/** The pages the fake reader has in `casa`, by path. */
const casaPages = new Map<string, Page>([
  ["red/dns", dns],
  ["catalog/servidor", { ...dns, path: "catalog/servidor" }],
  ["catalog/servidor/nas", nas],
])

const noResults: SearchOutput = { allRepositories: false, results: [] }

type Calls = { page: unknown[]; search: unknown[] }

/** A `v1.docs` client answering from fixtures, recording what it was asked. */
function fakeDocs({
  repositories = [casa, nuevo],
  search = noResults,
  pages = casaPages,
  skillList = [],
}: {
  repositories?: DocsRepository[]
  search?: SearchOutput
  pages?: ReadonlyMap<string, Page>
  skillList?: DocsSkill[]
} = {}): { docs: DocsClient; skills: SkillsClient; calls: Calls } {
  const calls: Calls = { page: [], search: [] }
  const skills: SkillsClient = {
    list: async () => ({ skills: skillList }),
    get: async (input) => {
      const found = skillList.find((skill) => skill.name === input.name)
      if (found === undefined) throw new ORPCError("NOT_FOUND")
      return { name: found.name, text: `text of ${found.name}` }
    },
    file: async (input) => {
      const found = skillList.find((skill) => skill.name === input.name)
      if (found === undefined || !found.files.includes(input.path))
        throw new ORPCError("NOT_FOUND")
      return { name: found.name, path: input.path, text: `${input.path} text` }
    },
  }
  const docs: DocsClient = {
    nav: async () => ({ repositories }),
    page: async (input) => {
      calls.page.push(input)
      const page = pages.get(input.path ?? "")
      if (input.repository === "casa" && page !== undefined) return page
      throw new ORPCError("NOT_FOUND")
    },
    search: async (input) => {
      calls.search.push(input)
      return search
    },
  }
  return { docs, skills, calls }
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
    expect(text(result)).toBe('No page matches "zzz".')
    expect(result.structuredContent).toEqual({ results: [] })
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

const colofon: DocsSkill = {
  name: "colofon",
  repository: null,
  description: "Cómo usar el sitio.",
  type: "skill-md",
  path: "/.well-known/agent-skills/colofon/SKILL.md",
  archivePath: null,
  files: [],
  digest: "sha256:0",
}

const colofonDiagrams: DocsSkill = {
  name: "colofon-diagrams",
  repository: null,
  description: "Cómo dibujar diagramas.",
  type: "archive",
  path: "/.well-known/agent-skills/colofon-diagrams/SKILL.md",
  archivePath: "/.well-known/agent-skills/colofon-diagrams.tar.gz",
  files: ["references/type-bar.md", "references/type-line.md"],
  digest: "sha256:2",
}

const casaDeploy: DocsSkill = {
  name: "casa-deploy",
  repository: { slug: "casa", name: "Casa" },
  description: "Cómo se despliega.",
  type: "skill-md",
  path: "/.well-known/agent-skills/casa-deploy/SKILL.md",
  archivePath: null,
  files: [],
  digest: "sha256:1",
}

describe("skillsTool", () => {
  test("lists each skill with its owner, description, address and files", async () => {
    const { docs, skills } = fakeDocs({
      skillList: [colofon, colofonDiagrams, casaDeploy],
    })
    const result = await skillsTool({ docs, skills, origin })
    expect(text(result)).toBe(
      [
        "- `colofon` (the platform's): Cómo usar el sitio. https://docs.example.org/.well-known/agent-skills/colofon/SKILL.md",
        "- `colofon-diagrams` (the platform's): Cómo dibujar diagramas. https://docs.example.org/.well-known/agent-skills/colofon-diagrams/SKILL.md",
        "  Files: `references/type-bar.md`, `references/type-line.md`",
        "- `casa-deploy` (Casa's): Cómo se despliega. https://docs.example.org/.well-known/agent-skills/casa-deploy/SKILL.md",
        "",
        "Call skill with a name for its SKILL.md, or with a name and one of its files' paths for that file. To install them all, follow the setup procedure in the site's /llms.txt.",
      ].join("\n")
    )
    expect(result.structuredContent).toEqual({
      skills: [
        {
          name: "colofon",
          repository: null,
          description: "Cómo usar el sitio.",
          url: "https://docs.example.org/.well-known/agent-skills/colofon/SKILL.md",
          files: [],
        },
        {
          name: "colofon-diagrams",
          repository: null,
          description: "Cómo dibujar diagramas.",
          url: "https://docs.example.org/.well-known/agent-skills/colofon-diagrams/SKILL.md",
          files: ["references/type-bar.md", "references/type-line.md"],
        },
        {
          name: "casa-deploy",
          repository: "casa",
          description: "Cómo se despliega.",
          url: "https://docs.example.org/.well-known/agent-skills/casa-deploy/SKILL.md",
          files: [],
        },
      ],
    })
  })
})

describe("skillTool", () => {
  test("is the skill's text as the procedure returns it", async () => {
    const { docs, skills } = fakeDocs({ skillList: [colofon] })
    const result = await skillTool({
      docs,
      skills,
      origin,
      input: { name: "colofon" },
    })
    expect(result.isError).toBeUndefined()
    expect(text(result)).toBe("text of colofon")
  })

  test("an unknown skill is an error pointing at skills", async () => {
    const { docs, skills } = fakeDocs({ skillList: [colofon] })
    const result = await skillTool({
      docs,
      skills,
      origin,
      input: { name: "no-existe" },
    })
    expect(result.isError).toBe(true)
    expect(text(result)).toBe(
      'There is no skill "no-existe" you can read. Call skills to list them.'
    )
  })

  test("with a path, is that file's text", async () => {
    const { docs, skills } = fakeDocs({ skillList: [colofonDiagrams] })
    const result = await skillTool({
      docs,
      skills,
      origin,
      input: { name: "colofon-diagrams", path: "references/type-bar.md" },
    })
    expect(result.isError).toBeUndefined()
    expect(text(result)).toBe("references/type-bar.md text")
  })

  test("an unknown path is an error listing the skill's files", async () => {
    const { docs, skills } = fakeDocs({ skillList: [colofonDiagrams] })
    const result = await skillTool({
      docs,
      skills,
      origin,
      input: { name: "colofon-diagrams", path: "references/no.md" },
    })
    expect(result.isError).toBe(true)
    expect(text(result)).toBe(
      'The skill "colofon-diagrams" has no file "references/no.md". Its files: `SKILL.md`, `references/type-bar.md`, `references/type-line.md`.'
    )
  })

  test("a path on an unknown skill is an error pointing at skills", async () => {
    const { docs, skills } = fakeDocs({ skillList: [colofon] })
    const result = await skillTool({
      docs,
      skills,
      origin,
      input: { name: "no-existe", path: "references/x.md" },
    })
    expect(result.isError).toBe(true)
    expect(text(result)).toContain("Call skills to list them.")
  })

  test("other failures are not hidden", async () => {
    const { docs, skills } = fakeDocs()
    skills.get = async () => {
      throw new ORPCError("INTERNAL_SERVER_ERROR")
    }
    await expect(
      skillTool({ docs, skills, origin, input: { name: "colofon" } })
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
