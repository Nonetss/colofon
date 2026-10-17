// What a user pastes into their AI so it sets itself up for the site: where
// the setup procedure is and the key to send, in Markdown. The procedure
// itself (install every skill, then the optional MCP) lives in `/llms.txt`,
// so this text never goes stale. Without a key it says where to put one.

/** Stands for the user's key in a text shown before any key exists. */
export const KEY_PLACEHOLDER = "<tu API key>"

/**
 * The prompt that has an agent configure itself for the documentation at
 * `origin`, as Markdown: addresses and the header in code spans.
 */
export function skillsPrompt(origin: string, key = KEY_PLACEHOLDER): string {
  return [
    `Configúrate para usar y escribir la documentación de ${origin}.`,
    "",
    `- Sigue los pasos de «Configurar tu agente» en \`${origin}/llms.txt\`: instalan sus skills (cómo usar el sitio, cómo escribir documentación y las de cada proyecto) y, al terminar, te dicen que me preguntes si quiero que instales también su MCP: no lo instales sin que te lo confirme.`,
    `- Envía en cada petición la cabecera \`x-api-key: ${key}\`. Sin ella solo instalarás las skills de la plataforma, no las de cada proyecto.`,
    "- No guardes la clave en ningún fichero salvo la configuración de tu agente.",
  ].join("\n")
}
