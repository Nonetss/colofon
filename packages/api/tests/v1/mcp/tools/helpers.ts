import type { CallToolResult } from "@modelcontextprotocol/server"
import { ORPCError } from "@orpc/server"
import type { z } from "zod"
import type { DocsRepository, DocsSkill } from "#v1/docs/llm-text"
import type { docsOutput } from "#v1/docs/output"
import type { DocsClient, SkillsClient } from "#v1/mcp/scope"

// The fixtures the documentation and skills tool tests share: a fake
// `v1.docs`/`v1.skills` client answering from two repositories, their pages
// and a few skills.

export const origin = "https://docs.example.org"

export type Page = z.infer<typeof docsOutput.page>
export type SearchOutput = z.infer<typeof docsOutput.search>

export function entry(
  slug: string,
  path: string,
  title: string,
  description = ""
) {
  return { path, href: `/${slug}/${path}`, title, description, icon: null }
}

export const casa: DocsRepository = {
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

export const nuevo: DocsRepository = {
  slug: "nuevo",
  name: "Nuevo",
  title: null,
  description: null,
  available: false,
  home: null,
  nodes: [],
}

export const dns: Page = {
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

export type Node = NonNullable<Page["tree"]>["children"][number]

export function heading(tagName: "h2" | "h3", id: string, value: string): Node {
  return {
    type: "element",
    tagName,
    properties: { id },
    children: [{ type: "text", value }],
  }
}

export function paragraph(value: string): Node {
  return {
    type: "element",
    tagName: "p",
    properties: {},
    children: [{ type: "text", value }],
  }
}

/** `red/dns` with sections: "Resolución inversa" (with "PTR"), "Cachés". */
export const sections: Page = {
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
export const nas: Page = {
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
export const casaPages = new Map<string, Page>([
  ["red/dns", dns],
  ["catalog/servidor", { ...dns, path: "catalog/servidor" }],
  ["catalog/servidor/nas", nas],
])

export const noResults: SearchOutput = {
  allRepositories: false,
  partial: false,
  results: [],
  entities: [],
}

export type Calls = { page: unknown[]; search: unknown[] }

/** A `v1.docs` client answering from fixtures, recording what it was asked. */
export function fakeDocs({
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

export function text(result: CallToolResult): string {
  const [first] = result.content
  if (first?.type !== "text") throw new Error("No text content")
  return first.text
}

export const colofon: DocsSkill = {
  name: "colofon",
  repository: null,
  description: "Cómo usar el sitio.",
  type: "skill-md",
  path: "/.well-known/agent-skills/colofon/SKILL.md",
  archivePath: null,
  files: [],
  digest: "sha256:0",
}

export const colofonDiagrams: DocsSkill = {
  name: "colofon-diagrams",
  repository: null,
  description: "Cómo dibujar diagramas.",
  type: "archive",
  path: "/.well-known/agent-skills/colofon-diagrams/SKILL.md",
  archivePath: "/.well-known/agent-skills/colofon-diagrams.tar.gz",
  files: ["references/type-bar.md", "references/type-line.md"],
  digest: "sha256:2",
}

export const casaDeploy: DocsSkill = {
  name: "casa-deploy",
  repository: { slug: "casa", name: "Casa" },
  description: "Cómo se despliega.",
  type: "skill-md",
  path: "/.well-known/agent-skills/casa-deploy/SKILL.md",
  archivePath: null,
  files: [],
  digest: "sha256:1",
}
