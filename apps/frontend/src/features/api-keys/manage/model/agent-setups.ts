import {
  claudeCodeCommand,
  codexConfig,
  mcpServersJson,
} from "@nonete/api/v1/mcp/setup"
import { agentPrompt } from "@/features/api-keys/manage/model/agent-prompt"
import { skillsPrompt } from "@/features/api-keys/manage/model/skills-prompt"

// How to connect an agent to the documentation with a new key: the setup
// prompt that has it install every skill by itself, the MCP at `/mcp` in the
// config each client reads, or, for an agent without MCP, the instructions
// that point it at `llms.txt`. The MCP configs come from
// `@nonete/api/v1/mcp/setup`, which `/llms.txt` shares. Every text holds the key, so it
// is shown only in the dialog that shows the key once.

/** One way to connect an agent, shown as a tab of the created-key dialog. */
export type AgentSetup = {
  id: "skills" | "claude-code" | "codex" | "json" | "prompt"
  label: string
  text: string
  /** How the text is highlighted. */
  language: "markdown" | "shell" | "toml" | "json" | "plaintext"
  /** Where the text goes, in the user's words. */
  hint: string
}

/** Every way to connect an agent with `key`: the setup prompt, then the MCP ones. */
export function agentSetups(origin: string, key: string): AgentSetup[] {
  return [
    {
      id: "skills",
      label: "Skills",
      text: skillsPrompt(origin, key),
      language: "markdown",
      hint: "Pégaselo a tu IA: instala sola las skills de la documentación y te pregunta si quieres que instale también el MCP.",
    },
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
