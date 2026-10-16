import { agentPrompt } from "@/features/api-keys/manage/model/agent-prompt"

// How to connect an agent to the documentation with a new key: the MCP at
// `/mcp` in the config each client reads, or, for an agent without MCP, the
// instructions that point it at `llms.txt`. Every text holds the key, so it
// is shown only in the dialog that shows the key once.

/** One way to connect an agent, shown as a tab of the created-key dialog. */
export type AgentSetup = {
  id: "claude-code" | "codex" | "json" | "prompt"
  label: string
  text: string
  /** How the text is highlighted. */
  language: "shell" | "toml" | "json" | "plaintext"
  /** Where the text goes, in the user's words. */
  hint: string
}

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

/** Every way to connect an agent with `key`, the MCP ones first. */
export function agentSetups(origin: string, key: string): AgentSetup[] {
  return [
    {
      id: "claude-code",
      label: "Claude Code",
      text: claudeCodeCommand(origin, key),
      language: "shell",
      hint: "Ejecútalo en la terminal, dentro del proyecto donde lo quieras.",
    },
    {
      id: "codex",
      label: "Codex",
      text: codexConfig(origin, key),
      language: "toml",
      hint: "Añádelo a ~/.codex/config.toml.",
    },
    {
      id: "json",
      label: "Cursor y otros",
      text: mcpServersJson(origin, key),
      language: "json",
      hint: "Para los clientes que leen mcpServers en JSON, como Cursor (~/.cursor/mcp.json). Si ya tienes otros servidores, añade solo la entrada colofon.",
    },
    {
      id: "prompt",
      label: "Sin MCP",
      text: agentPrompt(origin, key),
      language: "plaintext",
      hint: "Pégaselo a una IA sin MCP para que lea la documentación con tu clave.",
    },
  ]
}
