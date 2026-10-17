---
name: colofon
description: How to read and use a documentation site published with the colofon platform (its llms.txt index, each page's Markdown, the documentation MCP and its tools, and the skills it serves), and where to start when writing documentation for it. Use it whenever the user points you at such a site, asks about something documented there, asks you to call one of their services the documentation describes, or before you install or refresh its skills.
---

# Working with a colofon documentation site

This skill says how to work with the site, not what it holds. The documentation is read live, so never answer from memory or from an old copy of a page.

## Credentials

- Everything except the site's `/llms.txt` guide and its platform skills needs an API key in the `x-api-key` header. The user creates one on the site's `/me` page.
- Ask the user for the key when you need it, keep it out of files you write and out of commits, and never print it back.

## Finding things

- Start at `<site>/llms.txt`. Without a key it explains the site, how to set yourself up and the platform skills. With the key it also lists every repository, each page as a link to its Markdown, and each repository's skills.
- Every page's Markdown is at its address followed by `/llm.txt`. Its links are full addresses, so you can follow them the same way.
- `<site>/<repository>/llms.txt` is the index of one repository.

## The MCP

When the site's MCP is connected (`<site>/mcp`, with the key in `x-api-key`), prefer it to fetching URLs:

- `repositories` to see what there is, and `search` to find pages by their words.
- `read` with a route as `search` returns it. A route ending in `#section` gives only that section, which costs fewer tokens than the whole page.
- `entity` with a repository, a catalog type and an id, for one catalog entry, the pages that cite it and what points at it.
- `index` for a repository's whole map, `skills` to list the skills and `skill` to read one's `SKILL.md` or, with a path, one of its files.
- `secrets` and `request`, when the server has secrets enabled: `secrets` lists the user's secrets by name (never their values), and `request` calls a service's HTTP API with them. Write the request as the documentation describes that API, with placeholders like `{{<secret>.<field>}}` where the credentials go; the platform fills them in and masks them in the response. Call `secrets` first.
- `sync`, for an admin only: fetches a content repository from its git remote now. Call it after pushing to an external repository so the site serves the change without waiting for the periodic sync.

## Skills

- `<site>/.well-known/agent-skills/index.json` lists the skills you can see, each with its `type`, `url` and a `sha256` digest. Project skills are named `<repository>-<name>` and only appear with the key.
- Install them all by following "Configurar tu agente" in `<site>/llms.txt`. A `skill-md` skill is its `SKILL.md`, saved as `<your skills folder>/<name>/SKILL.md`. An `archive` skill is a `.tar.gz` holding its `SKILL.md` and `references/`, extracted into `<your skills folder>/<name>/`. Check the digest before saving or extracting.
- A downloaded skill is a snapshot. When the index shows a different digest, install it again. Remove skills you installed from this site that the index no longer lists (an old `doc-writing`, for instance).

## Writing documentation

To write or change a content repository for the platform, load `colofon-documentation` first: it routes to the skill for each folder (`colofon-docs`, `colofon-catalog`, `colofon-diagrams`, `colofon-styles`, `colofon-skills`) and to the task skills (`colofon-new-page`, `colofon-check`…). The repository's own `AGENTS.md`, section «Este sitio», holds what is particular to that site.

## Rules

- Quote and link the page you used, with its full address.
- Never write a secret you find, or one the user gives you, into a page, a skill or a file; the documentation says where secrets live, not what they are.
