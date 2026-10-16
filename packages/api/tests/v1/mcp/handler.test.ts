import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client"
import type { CallToolResult } from "@modelcontextprotocol/server"
import { resetEnv, testEnv } from "#tests/fixtures/env"
import type { ContentClient } from "#v1/mcp/content-tools"
import { serveMcp } from "#v1/mcp/handler"
import type { SecretsAccess } from "#v1/mcp/secret-tools"
import type { McpScope } from "#v1/mcp/server"
import {
  MCP_ADMIN_TOOL_NAMES,
  MCP_SECRET_TOOL_NAMES,
  MCP_TOOL_NAMES,
} from "#v1/mcp/setup"
import type { DocsClient, SkillsClient } from "#v1/mcp/tools"

// The real handler and server, driven by the SDK's own client over a fetch
// that calls `serveMcp` directly: no network, no backend. Each request gets the
// scope the backend would give it, so a call that reaches the fake client also
// proves the server factory found the scope `serveMcp` was given.

const origin = "https://docs.example.org"

const searched: unknown[] = []

const docs: DocsClient = {
  nav: async () => ({ repositories: [] }),
  page: async () => {
    throw new Error("not used")
  },
  search: async (input) => {
    searched.push(input)
    return { allRepositories: false, results: [] }
  },
}

const skills: SkillsClient = {
  list: async () => ({ skills: [] }),
  get: async () => {
    throw new Error("not used")
  },
}

const requested: unknown[] = []

const secrets: SecretsAccess = {
  list: async () => ({ enabled: true, secrets: [] }),
  request: async (input) => {
    requested.push(input)
    return {
      ok: true,
      response: {
        status: 200,
        statusText: "OK",
        headers: [["content-type", "application/json"]],
        body: {
          kind: "text",
          text: '{"echo":"[secret:komodo.key]"}',
          size: 30,
          truncated: false,
          complete: true,
        },
      },
    }
  },
}

const synced: unknown[] = []

const content: ContentClient = {
  syncRepository: async (input) => {
    synced.push(input)
    return {
      id: "00000000-0000-4000-8000-000000000001",
      slug: input.slug,
      name: "Casa",
      url: "https://github.com/nonete/casa.git",
      hosted: false,
      pushUrl: null,
      ref: "main",
      catalogUrl: `${origin}/api/v1/content/casa/catalog.json`,
      lastSyncedAt: "2026-10-16T10:00:00.000Z",
      lastCommit: "4f1c2a9",
      lastSyncError: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-10-16T10:00:00.000Z",
    }
  },
}

/** A user's scope; an admin's also carries the content client. */
const scope: McpScope = { docs, skills, secrets, content: null, origin }
const adminScope: McpScope = { ...scope, content }

function fetchWith(
  requestScope: McpScope
): (url: string | URL, init?: RequestInit) => Promise<Response> {
  return (url, init) =>
    serveMcp(new Request(url.toString(), init), requestScope)
}

const mcpFetch = fetchWith(scope)

const open: Client[] = []

async function connect(requestScope: McpScope = scope): Promise<Client> {
  const client = new Client({ name: "test", version: "1.0.0" })
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${origin}/mcp`), {
      fetch: fetchWith(requestScope),
    })
  )
  open.push(client)
  return client
}

beforeEach(() => resetEnv())

afterEach(async () => {
  await Promise.all(open.splice(0).map((client) => client.close()))
  searched.length = 0
  requested.length = 0
  synced.length = 0
})

/** Turns the secrets feature on for the rest of the test. */
function enableSecrets() {
  testEnv.SECRETS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64")
}

function text(result: CallToolResult): string {
  const [first] = result.content
  if (first?.type !== "text") throw new Error("No text content")
  return first.text
}

describe("serveMcp", () => {
  test("with secrets off, serves exactly the seven read-only tools /llms.txt names", async () => {
    const client = await connect()
    const { tools } = await client.listTools()
    const names = tools.map((tool) => tool.name).sort()
    expect(names).toEqual([
      "entity",
      "index",
      "read",
      "repositories",
      "search",
      "skill",
      "skills",
    ])
    expect(names).toEqual([...MCP_TOOL_NAMES].sort())
    for (const tool of tools) {
      expect(tool.annotations?.readOnlyHint).toBe(true)
      expect(tool.annotations?.idempotentHint).toBe(true)
    }
  })

  test("with secrets on, adds secrets (read-only) and request (destructive, open-world)", async () => {
    enableSecrets()
    const client = await connect()
    const { tools } = await client.listTools()

    expect(tools.map((tool) => tool.name).sort()).toEqual(
      [...MCP_TOOL_NAMES, ...MCP_SECRET_TOOL_NAMES].sort()
    )
    for (const tool of tools) {
      if (tool.name === "request") {
        expect(tool.annotations).toMatchObject({
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: false,
          openWorldHint: true,
        })
        continue
      }
      expect(tool.annotations?.readOnlyHint).toBe(true)
      expect(tool.annotations?.idempotentHint).toBe(true)
    }
    expect(client.getInstructions()).toContain("`request`")
  })

  test("with secrets off, the instructions don't mention them", async () => {
    const client = await connect()

    expect(client.getInstructions()).not.toContain("`request`")
  })

  test("request reaches the caller's executor with the arguments", async () => {
    enableSecrets()
    const client = await connect()
    const result = await client.callTool({
      name: "request",
      arguments: {
        method: "POST",
        url: "https://komodo.casa.lan/execute",
        headers: { "X-Api-Key": "{{komodo.key}}" },
        body: { type: "DeployStack" },
      },
    })

    expect(result.isError).toBeFalsy()
    expect(requested).toEqual([
      {
        method: "POST",
        url: "https://komodo.casa.lan/execute",
        headers: { "X-Api-Key": "{{komodo.key}}" },
        body: { type: "DeployStack" },
      },
    ])
  })

  test("for an admin, adds sync (writes, idempotent, open-world) and mentions it", async () => {
    const client = await connect(adminScope)
    const { tools } = await client.listTools()

    expect(tools.map((tool) => tool.name).sort()).toEqual(
      [...MCP_TOOL_NAMES, ...MCP_ADMIN_TOOL_NAMES].sort()
    )
    expect(tools.find((tool) => tool.name === "sync")?.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    })
    expect(client.getInstructions()).toContain("`sync`")
  })

  test("for anyone else, the instructions don't mention sync", async () => {
    const client = await connect()

    expect(client.getInstructions()).not.toContain("`sync`")
  })

  test("sync reaches the admin's content client with the slug", async () => {
    const client = await connect(adminScope)
    const result = await client.callTool({
      name: "sync",
      arguments: { repository: "casa" },
    })

    expect(result.isError).toBeFalsy()
    expect(text(result)).toContain("Synced Casa (casa) at main.")
    expect(synced).toEqual([{ slug: "casa" }])
  })

  test("identifies itself and tells the agent where to start", async () => {
    const client = await connect()
    expect(client.getServerVersion()?.name).toBe("colofon")
    expect(client.getInstructions()).toContain("`search`")
    expect(client.getInstructions()).toContain("`entity`")
    expect(client.getInstructions()).toContain("`skills`")
    expect(client.getInstructions()).toContain("`#section`")
  })

  test("a call reaches its tool with the request's client", async () => {
    const client = await connect()
    const result = await client.callTool({
      name: "search",
      arguments: { query: "dns" },
    })
    expect(result.isError).toBeFalsy()
    expect(text(result)).toBe('No page matches "dns".')
    expect(searched).toEqual([{ query: "dns", limit: 10 }])
  })

  test("invalid arguments come back as a tool error naming them", async () => {
    const client = await connect()
    const result = await client.callTool({ name: "search", arguments: {} })
    expect(result.isError).toBe(true)
    expect(text(result)).toContain("query")
    expect(searched).toEqual([])
  })

  test("entity needs its repository, type and id", async () => {
    const client = await connect()
    const result = await client.callTool({
      name: "entity",
      arguments: { repository: "casa", type: "servidor" },
    })
    expect(result.isError).toBe(true)
    expect(text(result)).toContain("id")
  })

  test("keeps no sessions: a GET is not allowed", async () => {
    const response = await mcpFetch(`${origin}/mcp`, {
      method: "GET",
      headers: { accept: "text/event-stream" },
    })
    expect(response.status).toBe(405)
  })
})
