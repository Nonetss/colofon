// What a user pastes into their AI so it installs the site's Agent Skills:
// where the discovery index is, how to download each skill with the key, and
// where to read the rest, in Markdown. Without a key it says where to put one.

/** Stands for the user's key in a text shown before any key exists. */
export const KEY_PLACEHOLDER = "<tu API key>"

/**
 * The instructions for an agent to install the skills of the site at
 * `origin`, as Markdown: addresses, paths and the header in code spans.
 */
export function skillsPrompt(origin: string, key = KEY_PLACEHOLDER): string {
  return [
    `Instala las skills de la documentación de ${origin}.`,
    "",
    `- El índice está en \`${origin}/.well-known/agent-skills/index.json\` (formato Agent Skills discovery). Por cada skill que liste, descarga su \`url\` y guárdala como \`<nombre>/SKILL.md\` en tu carpeta de skills (en Claude Code, \`~/.claude/skills/\`).`,
    `- Envía en cada petición la cabecera \`x-api-key: ${key}\`. Sin ella solo verás las skills de la plataforma, no las de cada proyecto.`,
    "- Comprueba que el SHA-256 de cada fichero coincide con su `digest`, y vuelve a descargarla cuando el índice muestre otro.",
    `- Después lee \`${origin}/llms.txt\`: explica el MCP y cómo leer cada página.`,
  ].join("\n")
}
