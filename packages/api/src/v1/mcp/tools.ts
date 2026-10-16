import type { CallToolResult } from "@modelcontextprotocol/server"
import { ORPCError } from "@orpc/server"
import { z } from "zod"
import type { AppRouterClient } from "#router"
import { withOrigin } from "#v1/docs/full-links"
import type { docsInput } from "#v1/docs/input"
import {
  type DocsRepository,
  llmsIndex,
  repositoryLlmsIndex,
} from "#v1/docs/llm-text"
import { pageMarkdown } from "#v1/docs/markdown"

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

/** What every tool gets: the caller's client and the public origin. */
export type ToolScope = {
  docs: DocsClient
  /** Origin the site is reached at, prefixed to every reader route. */
  origin: string
}

/** A reader route split into the repository and the page under it. */
export type ParsedRoute = { repository: string; path: string }

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
    })
  ),
})

export type SearchHit = z.infer<typeof searchOutput>["results"][number]

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

/**
 * The repository and page `route` names, in any form an agent has seen: a
 * reader route (`/casa/red/dns`), a search result's (`…#section`), an index
 * link (`https://…/casa/red/dns/llm.txt`), with or without a trailing slash
 * or query. Null when it names no repository.
 */
export function parseRoute(route: string): ParsedRoute | null {
  const path = decoded(
    routePath(route.trim())
      .replace(/\/llm\.txt$/, "")
      .replace(/\/+$/, "")
  )
  if (path === null) return null
  const [repository, ...rest] = path.split("/").filter((part) => part !== "")
  if (repository === undefined) return null
  return { repository, path: rest.join("/") }
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
  origin,
  input,
}: ToolScope & {
  input: { repository?: string | undefined }
}): Promise<CallToolResult> {
  const nav = await docs.nav()
  if (input.repository === undefined)
    return textResult(llmsIndex(nav.repositories, origin))
  const repository = nav.repositories.find(
    (entry) => entry.slug === input.repository && entry.available
  )
  if (repository === undefined)
    return errorResult(unknownRepository(input.repository))
  return textResult(repositoryLlmsIndex(repository, origin))
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
  return lines
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
  if (results.length === 0)
    return {
      ...textResult(`No page matches "${input.query}".`),
      structuredContent: { results },
    }
  const lines = results.flatMap((hit) => hitLines(hit, found.allRepositories))
  return {
    ...textResult(
      [
        `${results.length} results for "${input.query}". Pass a route to read for the whole page.`,
        "",
        ...lines,
      ].join("\n")
    ),
    structuredContent: { results },
  }
}

type Page = Awaited<ReturnType<DocsClient["page"]>>

/**
 * Where the page is, for an agent that arrived by a link: the repository,
 * the groups and sections above it and its title, and its address.
 */
function locationLine(page: Page, origin: string): string {
  const trail = [
    page.repository.name,
    ...page.breadcrumbs.map((crumb) => crumb.title),
    page.header.title,
  ].join(" / ")
  return `Location: ${trail} (${origin}${page.href})`
}

/**
 * `read`: one page as Markdown, the text of its `llm.txt` route, under a line
 * saying where the page is.
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
    const page = await docs.page(route)
    const markdown = pageMarkdown({
      title: page.header.title,
      description: page.header.description,
      tree: page.tree,
    })
    return textResult(
      `${locationLine(page, origin)}\n\n${withOrigin(markdown, origin)}`
    )
  } catch (error) {
    if (!isMissing(error)) throw error
    return errorResult(
      `There is no page at "${input.route}". Use search or index to find its route.`
    )
  }
}
