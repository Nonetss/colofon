// What a user pastes into their AI so it can read the documentation with
// their key: where the index is and how to authenticate.

/** The instructions for an agent, with the site's address and the key. */
export function agentPrompt(origin: string, key: string): string {
  return [
    `Lee la documentación en ${origin}/llms.txt: es un índice con un enlace a cada página.`,
    "Cada página se lee en Markdown en su enlace terminado en /llm.txt.",
    `Envía en cada petición la cabecera x-api-key: ${key}`,
  ].join("\n")
}
