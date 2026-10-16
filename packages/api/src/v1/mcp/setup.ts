// How a client connects to the documentation MCP with an API key: its
// address and the config each client reads. The created-key dialog on `/me`
// shows them with the new key, and `/llms.txt` shows the Claude Code one with
// a placeholder, so both stay the same. No imports: the dialog's browser
// bundle loads this file on its own.

/**
 * The documentation tools the server always registers (`server.ts`), as
 * `/llms.txt` names them; `tests/v1/mcp/handler.test.ts` checks they are the
 * ones it lists.
 */
export const MCP_TOOL_NAMES = [
  "repositories",
  "search",
  "index",
  "read",
  "entity",
  "skills",
  "skill",
] as const

/**
 * The tools the server adds when the secrets feature is on
 * (`SECRETS_ENCRYPTION_KEY` set), which the frontend can't tell.
 */
export const MCP_SECRET_TOOL_NAMES = ["secrets", "request"] as const

/** The name every client lists the server under. */
const SERVER_NAME = "colofon"

/** The documentation MCP's address on `origin`. */
export function mcpUrl(origin: string): string {
  return `${origin}/mcp`
}

/** Claude Code's command, which stores the server in the project's config. */
export function claudeCodeCommand(origin: string, key: string): string {
  return `claude mcp add --transport http ${SERVER_NAME} ${mcpUrl(origin)} --header "x-api-key: ${key}"`
}

/** Codex's `config.toml` entry: `codex mcp add` can't set a header. */
export function codexConfig(origin: string, key: string): string {
  return [
    `[mcp_servers.${SERVER_NAME}]`,
    `url = "${mcpUrl(origin)}"`,
    `http_headers = { "x-api-key" = "${key}" }`,
  ].join("\n")
}

/** The `mcpServers` JSON that Cursor and most other clients read. */
export function mcpServersJson(origin: string, key: string): string {
  const config = {
    mcpServers: {
      [SERVER_NAME]: { url: mcpUrl(origin), headers: { "x-api-key": key } },
    },
  }
  return JSON.stringify(config, null, 2)
}
