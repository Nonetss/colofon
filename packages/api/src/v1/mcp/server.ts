import { McpServer } from "@modelcontextprotocol/server"
import { z } from "zod"
import { docsInput } from "#v1/docs/input"
import {
  indexTool,
  readTool,
  repositoriesOutput,
  repositoriesTool,
  searchOutput,
  searchTool,
  type ToolScope,
} from "#v1/mcp/tools"

// The documentation MCP: one server per request, bound to the caller's client.
// It only declares the tools; what each one does lives in `tools.ts`.

const INSTRUCTIONS = [
  "Documentation of this site's content repositories, read as the API key's user.",
  "Start with `repositories` to see what there is, or `search` to find pages by their words.",
  "`index` lists every page of a repository (or of all of them) with its route; `read` returns one page as Markdown.",
  "Every link in the texts is a full address on this site; pass a page's route to `read` to follow it.",
].join(" ")

/** Every tool only reads the documentation, and the same call answers the same. */
const annotations = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: false,
}

const indexInput = z.object({
  repository: z
    .string()
    .optional()
    .describe(
      "Slug of one repository; every repository with content when missing"
    ),
})

const readInput = z.object({
  route: z
    .string()
    .min(1)
    .describe(
      "Route of the page, as search returns it or index links it: /<repository>/<page path>, a full address or a link ending in /llm.txt"
    ),
})

/** The MCP server for one request, its tools reading as that request's user. */
export function createDocsMcpServer(scope: ToolScope): McpServer {
  const server = new McpServer(
    { name: "colofon", version: "1.0.0" },
    { instructions: INSTRUCTIONS }
  )

  server.registerTool(
    "repositories",
    {
      title: "Repositories",
      description:
        "List the documentation repositories you can read: slug, name, description, whether they have content and the address of their llms.txt index.",
      outputSchema: repositoriesOutput,
      annotations,
    },
    () => repositoriesTool(scope)
  )

  server.registerTool(
    "index",
    {
      title: "Index",
      description:
        "The llms.txt index: every page of every repository (or of one, by slug) as a Markdown link to its text, with its sections and description, in the order of the site's navigation.",
      inputSchema: indexInput,
      annotations,
    },
    (input) => indexTool({ ...scope, input })
  )

  server.registerTool(
    "search",
    {
      title: "Search",
      description:
        "Search the documentation pages by their words, ranked by relevance (title, headings, description, body). Every word must match; prefixes and one-letter typos in long words also match. Each result has the route to pass to read and, for a match in the body, an excerpt. Pass repository to search only one; an unknown one is an error.",
      inputSchema: docsInput.search,
      outputSchema: searchOutput,
      annotations,
    },
    (input) => searchTool({ ...scope, input })
  )

  server.registerTool(
    "read",
    {
      title: "Read page",
      description:
        "Read one documentation page as Markdown: a first line with where it is (repository, sections and address), then its title, description and body, with links as full addresses. Diagrams come as their caption and lists of zones and connections.",
      inputSchema: readInput,
      annotations,
    },
    (input) => readTool({ ...scope, input })
  )

  return server
}
