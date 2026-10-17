---
title: For AI agents
description: The Markdown routes and llms.txt, the documentation MCP and its tools, the Agent Skills the site serves, and calling APIs with secrets the agent never sees.
order: 4
---

Colofon serves the same documentation to people and to agents. An agent reads it as the user whose **API key** it holds, so it sees exactly the repositories and pages that user sees in the reader. Every user creates their own keys at `/me/api-keys`.

## Markdown and `llms.txt`

Every page also exists as Markdown, the same text "Copiar en Markdown" copies, with links as full addresses:

| Route | What it is |
| --- | --- |
| `/llms.txt` | The index for agents ([llmstxt.org](https://llmstxt.org)): a guide to the site, its MCP and its skills, then every page of every repository as a link to its Markdown |
| `/<slug>/llms.txt` | The index of one repository |
| `<page>/llm.txt` | One page as Markdown, e.g. `/manual/red/dns/llm.txt` |

They take a session or an API key in the `x-api-key` header:

```bash
curl -H "x-api-key: $COLOFON_KEY" https://docs.example.com/llms.txt
```

Without a key, `/llms.txt` still answers with the guide and the platform's skills, but names no repository; the other routes answer `401` with a short explanation.

## The documentation MCP

The backend serves an MCP server at `/mcp` (Streamable HTTP, stateless), named `colofon`. Every tool runs as the key's user, through the same access checks as the reader.

- `repositories`, `index`, `search`, `read`: list the repositories, get the `llms.txt` index, search pages by their words and read one page (or one `#section`) as Markdown.
- `entity`: one catalog entity with its fields, the pages that cite it and the entities that point at it.
- `skills`, `skill`: list the Agent Skills and read one.
- `my_repositories`, `add_repository`, `sync`: the user's own repositories and saved credentials (never tokens), add one, and sync one now after pushing instead of waiting for the five-minute refresh.
- `secrets`, `request`: only when the server has `SECRETS_ENCRYPTION_KEY` set (below).

The API key dialog gives the config for each client with the new key filled in. For Claude Code:

```bash
claude mcp add --transport http colofon https://docs.example.com/mcp --header "x-api-key: <your key>"
```

For Cursor and most other clients, the `mcpServers` JSON:

```json
{
  "mcpServers": {
    "colofon": {
      "url": "https://docs.example.com/mcp",
      "headers": { "x-api-key": "<your key>" }
    }
  }
}
```

Codex reads the same address and header from a `[mcp_servers.colofon]` entry in its `config.toml`.

## Agent Skills

The site serves [Agent Skills](https://agentskills.io) at `/.well-known/agent-skills/index.json`, with a digest per skill:

- **The platform's**, to everyone: `colofon` (how to work with the site and its tools) and the `colofon-*` writing skills (see [Writing content](../content/)).
- **Each repository's**, from its `skills/` folder, as `<slug>-<name>`, only to users who can read that repository.

**Skills para tu IA** (`/me/skills`) has one text to paste into the AI. It points at the setup procedure in `/llms.txt`: the AI downloads the index, installs every skill it lists after checking its digest, and asks whether to connect the MCP too. Running it again refreshes the skills whose digest changed.

## Secrets without exposure

An agent often needs a credential to act on what the documentation describes (an API token, a user and password). Colofon lets it use one **without ever seeing it**.

1. The user saves a secret at **Secretos** (`/me/secrets`): a name, a description for the agent, one or more fields with their values, the origins it may be sent to, and whether it allows write methods or placeholders in the URL or body. Values are stored encrypted and never shown again.
2. The agent lists the secrets with `secrets` (names, fields and rules, never values) and calls `request` with an HTTP request written as the service's documentation describes it, with placeholders such as `{{komodo.key}}` or `{{basic(nas.user, nas.password)}}`.
3. The platform checks the origin and the rules, fills the values in, sends the request and returns the response with every value used masked as `[secret:komodo.key]`.

A request to another origin, or a write with a secret that doesn't allow it, is refused before anything is sent. Secrets are managed only from a signed-in browser session: a request with an API key can list them but can't create, change or delete them, or read their usage log. Every request sent or refused is logged, without headers, bodies or values.
