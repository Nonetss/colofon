import { describe, expect, test } from "bun:test"
import { agentPrompt } from "@/features/api-keys/manage/model/agent-prompt"
import {
  agentSetups,
  claudeCodeCommand,
  codexConfig,
  mcpServersJson,
  mcpUrl,
} from "@/features/api-keys/manage/model/agent-setups"

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

describe("agentSetups", () => {
  const setups = agentSetups(origin, key)

  test("offers the MCP clients first and the plain instructions last", () => {
    expect(setups.map((setup) => setup.id)).toEqual([
      "claude-code",
      "codex",
      "json",
      "prompt",
    ])
  })

  test("every text carries the key", () => {
    for (const setup of setups) expect(setup.text).toContain(key)
  })

  test("the last one is the prompt for an agent without MCP", () => {
    expect(setups.at(-1)?.text).toBe(agentPrompt(origin, key))
  })
})
