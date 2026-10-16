import { afterEach, describe, expect, test } from "bun:test"
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client"
import type { CallToolResult } from "@modelcontextprotocol/server"
import { serveMcp } from "#v1/mcp/handler"
import type { DocsClient, ToolScope } from "#v1/mcp/tools"

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

const scope: ToolScope = { docs, origin }

async function mcpFetch(
  url: string | URL,
  init?: RequestInit
): Promise<Response> {
  return serveMcp(new Request(url.toString(), init), scope)
}

const open: Client[] = []

async function connect(): Promise<Client> {
  const client = new Client({ name: "test", version: "1.0.0" })
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${origin}/mcp`), {
      fetch: mcpFetch,
    })
  )
  open.push(client)
  return client
}

afterEach(async () => {
  await Promise.all(open.splice(0).map((client) => client.close()))
  searched.length = 0
})

function text(result: CallToolResult): string {
  const [first] = result.content
  if (first?.type !== "text") throw new Error("No text content")
  return first.text
}

describe("serveMcp", () => {
  test("serves exactly the five read-only tools", async () => {
    const client = await connect()
    const { tools } = await client.listTools()
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      "entity",
      "index",
      "read",
      "repositories",
      "search",
    ])
    for (const tool of tools) {
      expect(tool.annotations?.readOnlyHint).toBe(true)
      expect(tool.annotations?.idempotentHint).toBe(true)
    }
  })

  test("identifies itself and tells the agent where to start", async () => {
    const client = await connect()
    expect(client.getServerVersion()?.name).toBe("colofon")
    expect(client.getInstructions()).toContain("`search`")
    expect(client.getInstructions()).toContain("`entity`")
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
