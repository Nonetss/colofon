import { describe, expect, test } from "bun:test"
import {
  claudeCodeCommand,
  codexConfig,
  mcpServersJson,
  mcpUrl,
} from "#v1/mcp/setup"

const origin = "https://doc.example.com"
const key = "sk_secret"

describe("mcpUrl", () => {
  test("is /mcp on the site", () => {
    expect(mcpUrl(origin)).toBe("https://doc.example.com/mcp")
  })
})

describe("claudeCodeCommand", () => {
  test("adds the HTTP server with the key as its header", () => {
    expect(claudeCodeCommand(origin, key)).toBe(
      'claude mcp add --transport http colofon https://doc.example.com/mcp --header "x-api-key: sk_secret"'
    )
  })
})

describe("codexConfig", () => {
  test("is a config.toml table with the URL and the header", () => {
    expect(codexConfig(origin, key)).toBe(
      [
        "[mcp_servers.colofon]",
        'url = "https://doc.example.com/mcp"',
        'http_headers = { "x-api-key" = "sk_secret" }',
      ].join("\n")
    )
  })
})

describe("mcpServersJson", () => {
  test("is valid JSON with the server under mcpServers", () => {
    expect(JSON.parse(mcpServersJson(origin, key))).toEqual({
      mcpServers: {
        colofon: {
          url: "https://doc.example.com/mcp",
          headers: { "x-api-key": "sk_secret" },
        },
      },
    })
  })
})
