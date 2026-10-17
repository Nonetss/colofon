---
title: Para agentes de IA
description: Las rutas en Markdown y llms.txt, el MCP de documentación y sus herramientas, las Agent Skills que sirve el sitio y las llamadas a APIs con secretos que el agente nunca ve.
order: 4
---

Colofon sirve la misma documentación a personas y a agentes. Un agente la lee como el usuario cuya **API key** tiene, así que ve exactamente los repositorios y páginas que ese usuario ve en el lector. Cada usuario crea sus propias claves en `/me/api-keys`.

## Markdown y `llms.txt`

Cada página existe también en Markdown, el mismo texto que copia «Copiar en Markdown», con los enlaces como direcciones completas:

| Ruta | Qué es |
| --- | --- |
| `/llms.txt` | El índice para agentes ([llmstxt.org](https://llmstxt.org)): una guía del sitio, su MCP y sus skills, y luego cada página de cada repositorio como enlace a su Markdown |
| `/<slug>/llms.txt` | El índice de un repositorio |
| `<página>/llm.txt` | Una página en Markdown, p. ej. `/manual/red/dns/llm.txt` |

Aceptan una sesión o una API key en la cabecera `x-api-key`:

```bash
curl -H "x-api-key: $COLOFON_KEY" https://docs.example.com/llms.txt
```

Sin clave, `/llms.txt` responde igualmente con la guía y las skills de la plataforma, pero no nombra ningún repositorio; el resto de rutas responde `401` con una explicación breve.

## El MCP de documentación

El backend sirve un servidor MCP en `/mcp` (Streamable HTTP, sin estado), llamado `colofon`. Cada herramienta se ejecuta como el usuario de la clave, con las mismas comprobaciones de acceso que el lector.

- `repositories`, `index`, `search`, `read`: listar los repositorios, obtener el índice `llms.txt`, buscar páginas por sus palabras y leer una página (o una `#sección`) en Markdown.
- `entity`: una entidad del catálogo con sus campos, las páginas que la citan y las entidades que apuntan a ella.
- `skills`, `skill`: listar las Agent Skills y leer una.
- `my_repositories`, `add_repository`, `sync`: los repositorios propios del usuario y sus credenciales guardadas (nunca los tokens), añadir uno y sincronizar uno al momento tras un push en vez de esperar al refresco de cinco minutos.
- `secrets`, `request`: solo si el servidor tiene definida `SECRETS_ENCRYPTION_KEY` (más abajo).

El diálogo de la API key da la configuración de cada cliente con la clave nueva ya puesta. Para Claude Code:

```bash
claude mcp add --transport http colofon https://docs.example.com/mcp --header "x-api-key: <tu clave>"
```

Para Cursor y la mayoría de clientes, el JSON `mcpServers`:

```json
{
  "mcpServers": {
    "colofon": {
      "url": "https://docs.example.com/mcp",
      "headers": { "x-api-key": "<tu clave>" }
    }
  }
}
```

Codex lee la misma dirección y cabecera de una entrada `[mcp_servers.colofon]` en su `config.toml`.

## Agent Skills

El sitio sirve [Agent Skills](https://agentskills.io) en `/.well-known/agent-skills/index.json`, con un digest por skill:

- **Las de la plataforma**, a todo el mundo: `colofon` (cómo trabajar con el sitio y sus herramientas) y las skills de escritura `colofon-*` (ver [Escribir contenido](../content/)).
- **Las de cada repositorio**, de su carpeta `skills/`, como `<slug>-<nombre>`, solo a quien puede leer ese repositorio.

**Skills para tu IA** (`/me/skills`) tiene un texto para pegar en la IA. Apunta al procedimiento de configuración de `/llms.txt`: la IA descarga el índice, instala cada skill que lista tras comprobar su digest y pregunta si conectar también el MCP. Repetirlo actualiza las skills cuyo digest cambió.

## Secretos sin exponerlos

Un agente necesita a menudo una credencial para actuar sobre lo que describe la documentación (un token de API, un usuario y una contraseña). Colofon le deja usarla **sin verla nunca**.

1. El usuario guarda un secreto en **Secretos** (`/me/secrets`): un nombre, una descripción para el agente, uno o más campos con sus valores, los orígenes a los que se puede enviar y si permite métodos de escritura o placeholders en la URL o el cuerpo. Los valores se guardan cifrados y no se vuelven a mostrar.
2. El agente lista los secretos con `secrets` (nombres, campos y reglas, nunca valores) y llama a `request` con una petición HTTP escrita como la describe la documentación del servicio, con placeholders como `{{komodo.key}}` o `{{basic(nas.user, nas.password)}}`.
3. La plataforma comprueba el origen y las reglas, rellena los valores, envía la petición y devuelve la respuesta con cada valor usado enmascarado como `[secret:komodo.key]`.

Una petición a otro origen, o una escritura con un secreto que no la permite, se rechaza antes de enviar nada. Los secretos solo se gestionan desde una sesión del navegador: con una API key se pueden listar, pero no crear, cambiar ni borrar, ni leer su registro de uso. Cada petición enviada o rechazada queda registrada, sin cabeceras, cuerpos ni valores.
