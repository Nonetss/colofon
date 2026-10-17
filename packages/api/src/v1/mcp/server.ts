import { McpServer } from "@modelcontextprotocol/server"
import { z } from "zod"
import { docsInput } from "#v1/docs/input"
import {
  addRepositoryInput,
  addRepositoryTool,
  type ContentClient,
  type CredentialClient,
  myRepositoriesOutput,
  myRepositoriesTool,
  syncInput,
  syncTool,
} from "#v1/mcp/content-tools"
import {
  requestTool,
  type SecretsAccess,
  secretsOutput,
  secretsTool,
} from "#v1/mcp/secret-tools"
import {
  entityTool,
  indexTool,
  readTool,
  repositoriesOutput,
  repositoriesTool,
  searchOutput,
  searchTool,
  skillsOutput,
  skillsTool,
  skillTool,
  type ToolScope,
} from "#v1/mcp/tools"
import { secretsEnabled } from "#v1/secret/cipher"
import { REQUEST_METHODS } from "#v1/secret/request/plan"

// The documentation MCP: one server per request, bound to the caller's client.
// It only declares the tools; what each one does lives in `tools.ts`.

/**
 * What the server is built with: the documentation tools' scope, the
 * caller's secrets (whose tools are listed only when secrets are on) and the
 * content and credential clients of the repository tools.
 */
export type McpScope = ToolScope & {
  secrets: SecretsAccess
  content: ContentClient
  credentials: CredentialClient
}

const INSTRUCTIONS = [
  "Documentation of this site's content repositories, read as the API key's user.",
  "Start with `repositories` to see what there is, or `search` to find pages by their words.",
  "`index` lists every page of a repository (or of all of them) with its route; `read` returns one page as Markdown, or only one section when the route ends in `#section` as search results do.",
  "`entity` looks up a catalog entity by repository, type and id: its fields, the pages that cite it and the entities that point at it.",
  "`skills` lists the Agent Skills you can install (the platform's, how to use the site and how to write documentation, and each project's) and `skill` returns one's SKILL.md or one of its files; `/llms.txt` has the procedure that installs them all.",
  "`my_repositories` lists the user's own repositories, with how their last sync went, and the git credentials the user saved; `add_repository` adds one of the user's repositories from its git URL, cloning a private one with a saved credential named by its username (never pass a token).",
  "`sync` fetches a repository from its git remote now, instead of waiting for the periodic sync: call it after pushing to an external repository, or after adding one, so the site serves your changes.",
  "Every link in the texts is a full address on this site; pass a page's route to `read` to follow it.",
]

const SECRETS_INSTRUCTIONS =
  "`secrets` lists the user's secrets by name (never their values) and `request` calls a service's HTTP API with them: write the request as the documentation describes that API, with placeholders such as {{<secret>.<field>}} that the platform fills in and masks in the response."

/** The instructions, mentioning the secrets tools only when they are served. */
function instructions(withSecrets: boolean): string {
  const lines = [...INSTRUCTIONS]
  if (withSecrets) lines.push(SECRETS_INSTRUCTIONS)
  return lines.join(" ")
}

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

const entityInput = z.object({
  repository: z.string().min(1).describe("Slug of the repository"),
  type: z
    .string()
    .min(1)
    .describe("Id of the catalog type, as in catalog/<type> routes"),
  id: z.string().min(1).describe("Id of the entity within its type"),
})

const requestInput = z.object({
  method: z
    .enum(REQUEST_METHODS)
    .describe(
      "HTTP method; POST, PUT, PATCH and DELETE need a secret that allows writing"
    ),
  url: z
    .string()
    .min(1)
    .describe(
      "Absolute http(s) URL. Its origin (scheme, host, port) must be one every secret used allows, and can't hold placeholders; the path and query can, if the secret allows the URL"
    ),
  headers: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      "Request headers; values may hold placeholders. host, connection, content-length, transfer-encoding and other hop-by-hop headers are refused"
    ),
  body: z
    .json()
    .optional()
    .describe(
      "A string, sent as is, or a JSON value, sent serialized with content-type application/json unless headers set one. Placeholders in its strings need a secret that allows the body"
    ),
})

/** The `request` tool writes on the user's services and reaches outside. */
const requestAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
}

const skillInput = z.object({
  name: z
    .string()
    .min(1)
    .describe(
      "Name of the skill, as skills lists it (`colofon`, `casa-deploy`)"
    ),
  path: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Path of one of the skill's files, as skills lists them (`references/type-bar.md`); its SKILL.md when missing"
    ),
})

/**
 * The `sync` tool writes the backend's clone and reaches the git remote, and
 * syncing again just checks out the same commit.
 */
const syncAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
}

/**
 * The `add_repository` tool stores a repository and reaches its git remote;
 * adding the same slug again is refused.
 */
const addRepositoryAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
}

/** The MCP server for one request, its tools reading as that request's user. */
export function createDocsMcpServer(scope: McpScope): McpServer {
  const server = new McpServer(
    { name: "colofon", version: "1.0.0" },
    { instructions: instructions(secretsEnabled()) }
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
        "Read one documentation page as Markdown: a first line with where it is (repository, sections and address), then its title, description and body, with links as full addresses. Diagrams come as their caption and lists of zones and connections. A route ending in #section (as search returns them) gives only that section and its subsections; an unknown section is an error listing the page's sections.",
      inputSchema: readInput,
      annotations,
    },
    (input) => readTool({ ...scope, input })
  )

  server.registerTool(
    "entity",
    {
      title: "Entity",
      description:
        "Read one catalog entity of a repository as Markdown, by its type and id: its fields (with the entities they name, linked), its source and its own page, the pages that cite it, the entities of other types that point at it and the diagrams it is in, under the same location line as read. An unknown repository, type or id is an error that says where to list the valid ones.",
      inputSchema: entityInput,
      annotations,
    },
    (input) => entityTool({ ...scope, input })
  )

  server.registerTool(
    "skills",
    {
      title: "Skills",
      description:
        "List the Agent Skills you can install from this site: the platform's own (colofon, how to work with the site, and the colofon-* skills for writing a content repository) and each project's, named <repository>-<name>, each with its description, the full address of its SKILL.md and the paths of its other files.",
      outputSchema: skillsOutput,
      annotations,
    },
    () => skillsTool(scope)
  )

  server.registerTool(
    "skill",
    {
      title: "Skill",
      description:
        "Read one Agent Skill's SKILL.md by the name skills lists, or, with path, one of its files (a reference its SKILL.md points at), exactly as the site serves it. An unknown name is an error; an unknown path is an error listing the skill's files.",
      inputSchema: skillInput,
      annotations,
    },
    (input) => skillTool({ ...scope, input })
  )

  registerRepositoryTools(server, scope)
  if (secretsEnabled()) registerSecretTools(server, scope)

  return server
}

/** `my_repositories`, `add_repository` and `sync`, on every user's server. */
function registerRepositoryTools(server: McpServer, scope: McpScope): void {
  server.registerTool(
    "my_repositories",
    {
      title: "My repositories",
      description:
        "List the user's own repositories (slug, URL without credentials, ref, folder, the credential it clones with, how its last sync went and its address) and the git credentials the user saved, by host and username, never their tokens. Call it before add_repository to pick a credential, or after it to see whether the first sync worked.",
      outputSchema: myRepositoriesOutput,
      annotations,
    },
    () => myRepositoriesTool(scope)
  )

  server.registerTool(
    "add_repository",
    {
      title: "Add repository",
      description:
        "Add a git repository of the user's, readable only by them, and start its first sync without waiting for it. The URL is a public https one without credentials; for a private repository, pass as credential the username of a saved credential for that host (my_repositories lists them; tokens are saved only on the profile page). The slug names it on the site and can't change. A slug in use, an address that isn't allowed or an unknown credential is an error with the reason.",
      inputSchema: addRepositoryInput,
      annotations: addRepositoryAnnotations,
    },
    (input) => addRepositoryTool({ ...scope, input })
  )

  server.registerTool(
    "sync",
    {
      title: "Sync repository",
      description:
        "Fetch one content repository you can read from its git remote now and check out its ref, waiting until it's done, instead of waiting for the periodic sync (every five minutes). Use it after pushing to an external repository (a push to one the platform hosts already syncs it) or after add_repository. Returns the commit checked out; an unknown repository or a git failure is an error with the reason.",
      inputSchema: syncInput,
      annotations: syncAnnotations,
    },
    (input) => syncTool({ ...scope, input })
  )
}

/** `secrets` and `request`, on a server whose secrets feature is on. */
function registerSecretTools(server: McpServer, scope: McpScope): void {
  server.registerTool(
    "secrets",
    {
      title: "Secrets",
      description:
        "List the user's secrets: each one's name, description, field placeholders ({{<secret>.<field>}}), the origins it may be sent to, whether it allows write methods and where its placeholders may go. Never their values. Call it before request.",
      outputSchema: secretsOutput,
      annotations,
    },
    () => secretsTool(scope)
  )

  server.registerTool(
    "request",
    {
      title: "HTTP request with secrets",
      description: [
        "Send one HTTP request to a service with the user's secrets, without seeing them. Write the request as the service's documentation describes it, putting placeholders where the credentials go; the platform fills them in, sends the request and returns the status, headers and body.",
        "Placeholders: {{<secret>.<field>}} is the value; {{basic(<secret>.<user>, <secret>.<password>)}} is the Base64 of user:password for an Authorization: Basic header; {{base64(<secret>.<field>)}} and {{urlencode(<secret>.<field>)}} encode one value. Any other {{...}} is sent as written.",
        "Rules: the request must use at least one secret; the URL's origin must be one every secret used allows; placeholders go in header values always, and in the URL or body only if the secret allows it; POST, PUT, PATCH and DELETE need secrets that allow writing. A refused request sends nothing and the error says why.",
        "Redirects are not followed (a 3xx comes back with its location). The request times out after 30 s. Every value used is masked in the response as [secret:<secret>.<field>] (values shorter than 4 characters are not masked). Text bodies are cut at 1 MB; other bodies are described by type and size.",
      ].join(" "),
      inputSchema: requestInput,
      annotations: requestAnnotations,
    },
    (input) => requestTool({ ...scope, input })
  )
}
