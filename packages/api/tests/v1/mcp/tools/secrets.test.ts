import { describe, expect, test } from "bun:test"
import type { CallToolResult } from "@modelcontextprotocol/server"
import {
  formatBytes,
  requestTool,
  type SecretsAccess,
  secretsTool,
} from "#v1/mcp/tools/secrets"
import type { RequestResult } from "#v1/secret/request/execute"
import type { RequestInput } from "#v1/secret/request/plan"

const origin = "https://docs.example.org"

type SecretsList = Awaited<ReturnType<SecretsAccess["list"]>>
type Listed = SecretsList["secrets"][number]
type Shared = SecretsList["shared"][number]

const komodo: Listed = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "komodo",
  description: "Komodo de casa: despliegues",
  fields: ["key", "secret"],
  origins: ["https://komodo.casa.lan"],
  allowWrite: true,
  allowInUrl: false,
  allowInBody: false,
  unreadable: false,
  organizations: [],
  lastUsedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

const sharedKomodo: Shared = {
  id: "00000000-0000-4000-8000-0000000000b1",
  name: "komodo",
  description: null,
  fields: ["key", "secret"],
  origins: ["https://komodo.equipo.lan"],
  allowWrite: false,
  allowInUrl: false,
  allowInBody: false,
  unreadable: false,
  organization: { id: "org-equipo", name: "Equipo docs", slug: "equipo-docs" },
  ownerName: "Ana",
  prefix: "equipo-docs/",
}

function access(
  listed: Listed[],
  result: RequestResult = { ok: false, message: "unused" },
  shared: Shared[] = []
): SecretsAccess {
  return {
    list: async () => ({ enabled: true, secrets: listed, shared }),
    request: async () => result,
  }
}

function text(result: CallToolResult): string {
  const [first] = result.content
  if (first?.type !== "text") throw new Error("No text content")
  return first.text
}

const input: RequestInput = {
  method: "GET",
  url: "https://komodo.casa.lan/read",
  headers: { "X-Api-Key": "{{komodo.key}}" },
}

describe("secretsTool", () => {
  test("lists each secret with its placeholders and rules, never a value", async () => {
    const result = await secretsTool({ secrets: access([komodo]), origin })

    const body = text(result)
    expect(body).toContain("## komodo")
    expect(body).toContain("Komodo de casa: despliegues")
    expect(body).toContain("{{komodo.key}}, {{komodo.secret}}")
    expect(body).toContain("https://komodo.casa.lan")
    expect(body).toContain("every method")
    expect(result.structuredContent).toEqual({
      secrets: [
        {
          name: "komodo",
          description: "Komodo de casa: despliegues",
          fields: ["key", "secret"],
          placeholders: ["{{komodo.key}}", "{{komodo.secret}}"],
          origins: ["https://komodo.casa.lan"],
          allowWrite: true,
          allowInUrl: false,
          allowInBody: false,
          unreadable: false,
        },
      ],
    })
  })

  test("marks a secret that can't be decrypted", async () => {
    const result = await secretsTool({
      secrets: access([{ ...komodo, unreadable: true, allowWrite: false }]),
      origin,
    })

    expect(text(result)).toContain("Unusable")
    expect(text(result)).toContain("reading methods only")
  })

  test("lists a shared secret after the own ones, with its prefixed placeholders and where it comes from", async () => {
    const result = await secretsTool({
      secrets: access([komodo], undefined, [sharedKomodo]),
      origin,
    })

    const body = text(result)
    expect(body.indexOf("## komodo")).toBeLessThan(
      body.indexOf("## equipo-docs/komodo")
    )
    expect(body).toContain(
      "Shared with you by Ana through the organization Equipo docs"
    )
    expect(body).toContain(
      "{{equipo-docs/komodo.key}}, {{equipo-docs/komodo.secret}}"
    )
    expect(result.structuredContent).toMatchObject({
      secrets: [
        {
          name: "komodo",
          placeholders: ["{{komodo.key}}", "{{komodo.secret}}"],
        },
        {
          name: "komodo",
          placeholders: [
            "{{equipo-docs/komodo.key}}",
            "{{equipo-docs/komodo.secret}}",
          ],
          organization: { name: "Equipo docs", slug: "equipo-docs" },
          ownerName: "Ana",
        },
      ],
    })
  })

  test("with only shared secrets, lists them instead of the empty text", async () => {
    const result = await secretsTool({
      secrets: access([], undefined, [sharedKomodo]),
      origin,
    })

    expect(text(result)).toContain("## equipo-docs/komodo")
    expect(text(result)).not.toContain("You have no secrets")
  })

  test("without secrets, says where to create them", async () => {
    const result = await secretsTool({ secrets: access([]), origin })

    expect(result.isError).toBeFalsy()
    expect(text(result)).toContain("https://docs.example.org/me/secrets")
  })
})

describe("requestTool", () => {
  test("a refusal is a tool error with its reason", async () => {
    const result = await requestTool({
      secrets: access([], { ok: false, message: 'Secret "komodo" can only…' }),
      origin,
      input,
    })

    expect(result.isError).toBe(true)
    expect(text(result)).toBe('Secret "komodo" can only…')
  })

  test("writes the status line, headers and body; an error status is no tool error", async () => {
    const result = await requestTool({
      secrets: access([], {
        ok: true,
        response: {
          status: 401,
          statusText: "Unauthorized",
          headers: [["content-type", "application/json"]],
          body: {
            kind: "text",
            text: '{"error":"bad [secret:komodo.key]"}',
            size: 34,
            truncated: false,
            complete: true,
          },
        },
      }),
      origin,
      input,
    })

    expect(result.isError).toBeFalsy()
    expect(text(result)).toBe(
      [
        "HTTP 401 Unauthorized",
        "content-type: application/json",
        "",
        '{"error":"bad [secret:komodo.key]"}',
      ].join("\n")
    )
  })

  test("says when the body was truncated and from what size", async () => {
    const result = await requestTool({
      secrets: access([], {
        ok: true,
        response: {
          status: 200,
          statusText: "OK",
          headers: [],
          body: {
            kind: "text",
            text: "a".repeat(1024 * 1024),
            size: 3 * 1024 * 1024,
            truncated: true,
            complete: true,
          },
        },
      }),
      origin,
      input,
    })

    expect(text(result)).toEndWith(
      "[Body truncated: showing the first 1 MB of 3 MB]"
    )
  })

  test("describes a binary body by type and size", async () => {
    const result = await requestTool({
      secrets: access([], {
        ok: true,
        response: {
          status: 200,
          statusText: "OK",
          headers: [],
          body: {
            kind: "binary",
            contentType: "application/zip",
            size: 2048,
            complete: true,
          },
        },
      }),
      origin,
      input,
    })

    expect(text(result)).toContain(
      "[Binary body not shown: application/zip, 2 KB]"
    )
  })
})

describe("formatBytes", () => {
  test.each([
    [512, "512 bytes"],
    [2048, "2 KB"],
    [1024 * 1024, "1 MB"],
    [1.5 * 1024 * 1024, "1.5 MB"],
  ])("%p is %p", (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected)
  })
})
