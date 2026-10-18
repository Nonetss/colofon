import type { CallToolResult } from "@modelcontextprotocol/server"
import { CATALOG_PATH, catalogTypePath, entityPath } from "@nonete/content"
import { ORPCError } from "@orpc/server"
import type { Root } from "hast"
import { z } from "zod"
import type { AppRouterClient } from "#router"
import { withOrigin } from "#v1/docs/full-links"
import type { docsInput } from "#v1/docs/input"
import {
  type DocsRepository,
  type DocsSkill,
  llmsIndex,
  repositoryLlmsIndex,
} from "#v1/docs/llm-text"
import { bodyMarkdown, pageMarkdown } from "#v1/docs/markdown"
import { sectionTree } from "#v1/mcp/section"

// The MCP's tools, one function each. They read through the `v1.docs`
// procedures as the caller (never the handlers or the content reader), so a
// tool shows exactly what the reader shows that user, and whatever access
// rule the procedures enforce applies here too. The texts are what an agent
// reads; `index` and `read` are byte for byte the `llms.txt` and `llm.txt`
// routes.

/** The `v1.docs` procedures the tools read through, called as the caller. */
export type DocsClient = Pick<
  AppRouterClient["v1"]["docs"],
  "nav" | "page" | "search"
>

/** The `v1.skills` procedures the skills tools read through. */
export type SkillsClient = Pick<
  AppRouterClient["v1"]["skills"],
  "list" | "get" | "file"
>

/** What every tool gets: the caller's client and the public origin. */
export type ToolScope = {
  docs: DocsClient
  skills: SkillsClient
  /** Origin the site is reached at, prefixed to every reader route. */
  origin: string
}

/**
 * A reader route split into the repository, the page under it and the
 * section it points at (its `#fragment`), if any.
 */
export type ParsedRoute = {
  repository: string
  path: string
  section: string | null
}

/** What `repositories` returns as structured content. */
export const repositoriesOutput = z.object({
  repositories: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      available: z
        .boolean()
        .describe("Whether the repository has readable content"),
      index: z
        .string()
        .nullable()
        .describe("Full address of its llms.txt; null without content"),
    })
  ),
})

export type RepositorySummary = z.infer<
  typeof repositoriesOutput
>["repositories"][number]

/** What `search` returns as structured content. */
export const searchOutput = z.object({
  partial: z
    .boolean()
    .describe(
      "Whether no page holds every word, so the results hold only some of them"
    ),
  results: z.array(
    z.object({
      repository: z.object({ slug: z.string(), name: z.string() }),
      route: z
        .string()
        .describe("Reader route of the page, at the matched section"),
      title: z.string(),
      description: z.string(),
      trail: z
        .array(z.string())
        .describe("Groups and sections above the page, outermost first"),
      excerpt: z
        .string()
        .nullable()
        .describe("The text around the match, when it is in the body"),
      missing: z
        .array(z.string())
        .describe("The query's words the page lacks, in a partial answer"),
      sections: z
        .array(
          z.object({
            heading: z.string(),
            route: z.string().describe("Reader route of the section"),
            excerpt: z.string(),
          })
        )
        .describe("Other sections of the page that match"),
    })
  ),
  entities: z.array(
    z.object({
      repository: z.object({ slug: z.string(), name: z.string() }),
      type: z.object({ id: z.string(), plural: z.string() }),
      id: z.string(),
      label: z.string(),
      route: z
        .string()
        .describe("Reader route of the entity's generated catalog page"),
    })
  ),
})

export type SearchHit = z.infer<typeof searchOutput>["results"][number]

type SearchEntityHit = z.infer<typeof searchOutput>["entities"][number]

function textResult(text: string): CallToolResult {
  return { content: [{ type: "text", text }] }
}

function errorResult(text: string): CallToolResult {
  return { content: [{ type: "text", text }], isError: true }
}

/**
 * Whether a reader call failed because there is no such repository or page,
 * or the route can't name one: the input check of `v1.docs.page` rejects
 * such paths before looking.
 */
function isMissing(error: unknown): boolean {
  if (!(error instanceof ORPCError)) return false
  return error.code === "NOT_FOUND" || error.code === "BAD_REQUEST"
}

function decoded(path: string): string | null {
  try {
    return decodeURIComponent(path)
  } catch {
    return null
  }
}

/** The path part of `route`: a full address's path, or the route itself. */
function routePath(route: string): string {
  if (/^https?:\/\//.test(route) && URL.canParse(route))
    return new URL(route).pathname
  return route.split(/[?#]/, 1)[0] ?? ""
}

/** The decoded `#fragment` of `route`; null without one, or an empty one. */
function routeSection(route: string): string | null {
  const at = route.indexOf("#")
  if (at === -1) return null
  const section = decoded(route.slice(at + 1))
  if (section === null || section === "") return null
  return section
}

/**
 * The repository, page and section `route` names, in any form an agent has
 * seen: a reader route (`/casa/red/dns`), a search result's (`…#section`),
 * an index link (`https://…/casa/red/dns/llm.txt`), with or without a
 * trailing slash or query. Null when it names no repository.
 */
export function parseRoute(route: string): ParsedRoute | null {
  const trimmed = route.trim()
  const path = decoded(
    routePath(trimmed)
      .replace(/\/llm\.txt$/, "")
      .replace(/\/+$/, "")
  )
  if (path === null) return null
  const [repository, ...rest] = path.split("/").filter((part) => part !== "")
  if (repository === undefined) return null
  return { repository, path: rest.join("/"), section: routeSection(trimmed) }
}

function indexUrl(repository: DocsRepository, origin: string): string | null {
  if (!repository.available) return null
  return `${origin}/${repository.slug}/llms.txt`
}

function repositoryLine(repository: RepositorySummary): string {
  const described = describedName(repository)
  if (repository.index === null)
    return `- \`${repository.slug}\`: ${described} (no content yet)`
  return `- \`${repository.slug}\`: ${described}. Index: ${repository.index}`
}

function describedName(repository: RepositorySummary): string {
  if (repository.description === null || repository.description === "")
    return repository.name
  return `${repository.name}, ${repository.description}`
}

/** `repositories`: every repository the caller can read. */
export async function repositoriesTool({
  docs,
  origin,
}: ToolScope): Promise<CallToolResult> {
  const nav = await docs.nav()
  const repositories = nav.repositories.map(
    (repository): RepositorySummary => ({
      slug: repository.slug,
      name: repository.name,
      description: repository.description,
      available: repository.available,
      index: indexUrl(repository, origin),
    })
  )
  if (repositories.length === 0)
    return {
      ...textResult("There are no documentation repositories."),
      structuredContent: { repositories },
    }
  return {
    ...textResult(repositories.map(repositoryLine).join("\n")),
    structuredContent: { repositories },
  }
}

function unknownRepository(slug: string): string {
  return `The repository "${slug}" does not exist or has no content yet. Call repositories to list them.`
}

/**
 * Why `slug` can't be searched (no such repository, or one without content),
 * or null when it can. `v1.docs.search` would quietly search every repository
 * instead, as the reader's "Todos" scope does, which would mislead an agent
 * that asked for one.
 */
async function missingRepository(
  docs: DocsClient,
  slug: string
): Promise<string | null> {
  const nav = await docs.nav()
  const found = nav.repositories.some(
    (repository) => repository.slug === slug && repository.available
  )
  if (found) return null
  return unknownRepository(slug)
}

/** `index`: the `llms.txt` of every repository, or of one. */
export async function indexTool({
  docs,
  skills,
  origin,
  input,
}: ToolScope & {
  input: { repository?: string | undefined }
}): Promise<CallToolResult> {
  const nav = await docs.nav()
  const listed = await skills.list()
  if (input.repository === undefined)
    return textResult(llmsIndex(nav.repositories, listed.skills, origin))
  const repository = nav.repositories.find(
    (entry) => entry.slug === input.repository && entry.available
  )
  if (repository === undefined)
    return errorResult(unknownRepository(input.repository))
  return textResult(repositoryLlmsIndex(repository, listed.skills, origin))
}

type SearchOutput = Awaited<ReturnType<DocsClient["search"]>>

function searchHit(result: SearchOutput["results"][number]): SearchHit {
  return {
    repository: result.repository,
    route: result.href,
    title: result.title,
    description: result.description,
    trail: result.trail,
    excerpt: excerptText(result.excerpt),
    missing: result.missing,
    sections: result.sections.map((section) => ({
      heading: section.heading,
      route: section.href,
      excerpt: section.excerpt.text,
    })),
  }
}

function searchEntityHit(
  entity: SearchOutput["entities"][number]
): SearchEntityHit {
  return {
    repository: entity.repository,
    type: entity.type,
    id: entity.id,
    label: entity.label,
    route: entity.href,
  }
}

function excerptText(
  excerpt: SearchOutput["results"][number]["excerpt"]
): string | null {
  if (excerpt === null) return null
  return excerpt.text
}

function hitLines(hit: SearchHit, withRepository: boolean): string[] {
  const label = [...hit.trail, hit.title].join(" / ")
  const lines = [`- **${label}**: \`${hit.route}\``]
  if (withRepository) lines.push(`  Repository: ${hit.repository.name}`)
  if (hit.description !== "") lines.push(`  ${hit.description}`)
  if (hit.excerpt !== null) lines.push(`  > ${hit.excerpt}`)
  if (hit.missing.length > 0)
    lines.push(`  Missing words: ${hit.missing.join(", ")}`)
  for (const section of hit.sections) {
    lines.push(`  Also in **${section.heading}**: \`${section.route}\``)
    lines.push(`    > ${section.excerpt}`)
  }
  return lines
}

function entityLines(entities: readonly SearchEntityHit[]): string[] {
  if (entities.length === 0) return []
  return [
    "Catalog entities (pass repository, type and id to entity):",
    ...entities.map(
      (entity) =>
        `- **${entity.label}** (${entity.type.plural}, ${entity.repository.name}): repository \`${entity.repository.slug}\`, type \`${entity.type.id}\`, id \`${entity.id}\``
    ),
  ]
}

/** The first lines of the answer: how many pages matched, and how well. */
function pagesHeader(
  query: string,
  results: readonly SearchHit[],
  partial: boolean
): string[] {
  if (results.length === 0) return [`No page matches "${query}".`]
  const count = `${results.length} results for "${query}". Pass a route to read for the whole page.`
  if (!partial) return [count]
  return [count, "No page holds every word; these hold some of them."]
}

/** `search`: the reader's search, ranked, each result with its route. */
export async function searchTool({
  docs,
  input,
}: ToolScope & {
  input: z.infer<typeof docsInput.search>
}): Promise<CallToolResult> {
  if (input.repository !== undefined) {
    const missing = await missingRepository(docs, input.repository)
    if (missing !== null) return errorResult(missing)
  }
  const found = await docs.search(input)
  const results = found.results.map(searchHit)
  const entities = found.entities.map(searchEntityHit)
  const structuredContent = { partial: found.partial, results, entities }
  if (results.length === 0 && entities.length === 0)
    return {
      ...textResult(`No page or catalog entity matches "${input.query}".`),
      structuredContent,
    }
  const blocks = [
    pagesHeader(input.query, results, found.partial),
    results.flatMap((hit) => hitLines(hit, found.allRepositories)),
    entityLines(entities),
  ].filter((lines) => lines.length > 0)
  return {
    ...textResult(blocks.map((lines) => lines.join("\n")).join("\n\n")),
    structuredContent,
  }
}

type Page = Awaited<ReturnType<DocsClient["page"]>>
type PageHeading = Page["headings"][number]

/**
 * Where the page (or one of its sections) is, for an agent that arrived by a
 * link: the repository, the groups and sections above it, its title and the
 * section's, and its address.
 */
function locationLine(
  page: Page,
  origin: string,
  section: PageHeading | null
): string {
  const trail = [
    page.repository.name,
    ...page.breadcrumbs.map((crumb) => crumb.title),
    page.header.title,
  ]
  if (section === null)
    return `Location: ${trail.join(" / ")} (${origin}${page.href})`
  const address = `${origin}${page.href}#${section.id}`
  return `Location: ${[...trail, section.text].join(" / ")} (${address})`
}

/** The whole page: its `llm.txt` text under the location line. */
function wholePage(page: Page, origin: string): string {
  const markdown = pageMarkdown({
    title: page.header.title,
    description: page.header.description,
    tree: page.tree,
  })
  return `${locationLine(page, origin, null)}\n\n${withOrigin(markdown, origin)}`
}

/** The section's own tree, or null when its heading isn't top-level. */
function sectionOf(page: Page, heading: PageHeading): Root | null {
  if (page.tree === null) return null
  return sectionTree(page.tree, heading.id)
}

/** The sections a page has, for an agent that asked for one it hasn't. */
function unknownSection(page: Page, section: string): string {
  const whole = `Read ${page.href} for the whole page.`
  if (page.headings.length === 0)
    return `The page ${page.href} has no section "#${section}", nor any other. ${whole}`
  const lines = page.headings.map(
    (heading) => `- \`#${heading.id}\`: ${heading.text}`
  )
  return [
    `The page ${page.href} has no section "#${section}". Its sections:`,
    ...lines,
    whole,
  ].join("\n")
}

/**
 * The page as a tool result: whole, or only the section `section` names
 * (the whole page when its heading sits inside another element).
 */
function pageResult(
  page: Page,
  origin: string,
  section: string | null
): CallToolResult {
  if (section === null) return textResult(wholePage(page, origin))
  const heading = page.headings.find((entry) => entry.id === section)
  if (heading === undefined) return errorResult(unknownSection(page, section))
  const tree = sectionOf(page, heading)
  if (tree === null) return textResult(wholePage(page, origin))
  const markdown = withOrigin(`${bodyMarkdown(tree)}\n`, origin)
  return textResult(`${locationLine(page, origin, heading)}\n\n${markdown}`)
}

/**
 * `read`: one page as Markdown, the text of its `llm.txt` route, under a line
 * saying where the page is; with a `#section`, only that section.
 */
export async function readTool({
  docs,
  origin,
  input,
}: ToolScope & { input: { route: string } }): Promise<CallToolResult> {
  const route = parseRoute(input.route)
  if (route === null)
    return errorResult(
      `"${input.route}" is not a documentation route. Routes look like /<repository>/<page path>.`
    )
  try {
    const page = await docs.page({
      repository: route.repository,
      path: route.path,
    })
    return pageResult(page, origin, route.section)
  } catch (error) {
    if (!isMissing(error)) throw error
    return errorResult(
      `There is no page at "${input.route}". Use search or index to find its route.`
    )
  }
}

/** What `entity` takes: the repository, the catalog type and the id. */
export type EntityInput = { repository: string; type: string; id: string }

/** Whether `repository` has a page at `path`, as the caller reads it. */
async function hasPage(
  docs: DocsClient,
  repository: string,
  path: string
): Promise<boolean> {
  try {
    await docs.page({ repository, path })
    return true
  } catch (error) {
    if (!isMissing(error)) throw error
    return false
  }
}

/**
 * Why the entity can't be read, with where to find the valid ones: the
 * repository, the type's catalog page or the catalog's.
 */
async function missingEntity(
  docs: DocsClient,
  input: EntityInput
): Promise<string> {
  const missing = await missingRepository(docs, input.repository)
  if (missing !== null) return missing
  const typePath = catalogTypePath(input.type)
  if (await hasPage(docs, input.repository, typePath))
    return `There is no entity "${input.id}" of type "${input.type}" in "${input.repository}". Read /${input.repository}/${typePath} to list the entities of that type.`
  return `There is no catalog type "${input.type}" in "${input.repository}". Read /${input.repository}/${CATALOG_PATH} to list the catalog types.`
}

/**
 * `entity`: one catalog entity, as its generated catalog page reads in
 * `read` (its fields, the pages that cite it, the entities that point at it
 * and its diagrams).
 */
export async function entityTool({
  docs,
  origin,
  input,
}: ToolScope & { input: EntityInput }): Promise<CallToolResult> {
  try {
    const page = await docs.page({
      repository: input.repository,
      path: entityPath(input.type, input.id),
    })
    return textResult(wholePage(page, origin))
  } catch (error) {
    if (!isMissing(error)) throw error
    return errorResult(await missingEntity(docs, input))
  }
}

/** What `skills` returns as structured content. */
export const skillsOutput = z.object({
  skills: z.array(
    z.object({
      name: z.string(),
      repository: z
        .string()
        .nullable()
        .describe(
          "Slug of the repository it comes from; null for the platform's"
        ),
      description: z.string(),
      url: z.string().describe("Full address of its SKILL.md"),
      files: z
        .array(z.string())
        .describe(
          "Paths of its files besides SKILL.md, each readable with skill and a path; empty for a single-file skill"
        ),
    })
  ),
})

type SkillSummary = z.infer<typeof skillsOutput>["skills"][number]

function skillSummary(skill: DocsSkill, origin: string): SkillSummary {
  return {
    name: skill.name,
    repository: repositorySlug(skill),
    description: skill.description,
    url: `${origin}${skill.path}`,
    files: skill.files,
  }
}

function repositorySlug(skill: DocsSkill): string | null {
  if (skill.repository === null) return null
  return skill.repository.slug
}

function ownerOf(skill: DocsSkill): string {
  if (skill.repository === null) return "the platform's"
  return `${skill.repository.name}'s`
}

/** One skill as `skills` lists it, with its files when it has any. */
function skillLine(skill: DocsSkill, origin: string): string {
  const line = `- \`${skill.name}\` (${ownerOf(skill)}): ${skill.description} ${origin}${skill.path}`
  if (skill.files.length === 0) return line
  return `${line}\n  Files: ${skill.files.map((file) => `\`${file}\``).join(", ")}`
}

/** `skills`: every skill the caller can see, as the discovery index lists them. */
export async function skillsTool({
  skills,
  origin,
}: ToolScope): Promise<CallToolResult> {
  const listed = await skills.list()
  const summaries = listed.skills.map((skill) => skillSummary(skill, origin))
  const lines = listed.skills.map((skill) => skillLine(skill, origin))
  return {
    ...textResult(
      [
        ...lines,
        "",
        "Call skill with a name for its SKILL.md, or with a name and one of its files' paths for that file. To install them all, follow the setup procedure in the site's /llms.txt.",
      ].join("\n")
    ),
    structuredContent: { skills: summaries },
  }
}

/**
 * `skill`: one skill's SKILL.md, or one of its files with `path`, as its
 * route serves it to the caller.
 */
export async function skillTool({
  skills,
  input,
}: ToolScope & {
  input: { name: string; path?: string | undefined }
}): Promise<CallToolResult> {
  const missingSkill = `There is no skill "${input.name}" you can read. Call skills to list them.`
  if (input.path === undefined) {
    try {
      const skill = await skills.get({ name: input.name })
      return textResult(skill.text)
    } catch (error) {
      if (!isMissing(error)) throw error
      return errorResult(missingSkill)
    }
  }
  const listed = await skills.list()
  const skill = listed.skills.find((entry) => entry.name === input.name)
  if (skill === undefined) return errorResult(missingSkill)
  try {
    const file = await skills.file({ name: input.name, path: input.path })
    return textResult(file.text)
  } catch (error) {
    if (!isMissing(error)) throw error
    return errorResult(missingFile(skill, input.path))
  }
}

function missingFile(skill: DocsSkill, path: string): string {
  const files = ["SKILL.md", ...skill.files].map((file) => `\`${file}\``)
  return `The skill "${skill.name}" has no file "${path}". Its files: ${files.join(", ")}.`
}
