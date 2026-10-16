---
name: colofon
description: How to read and use a documentation site published with the colofon platform (its llms.txt index, each page's Markdown, the documentation MCP and the skills it serves). Use it whenever the user points you at such a site, asks about something documented there, or before you install or refresh its skills.
---

# Working with a colofon documentation site

This skill says how to work with the site, not what it holds. The documentation is read live, so never answer from memory or from an old copy of a page.

## Credentials

- Everything except the site's `/llms.txt` guide and its platform skills needs an API key in the `x-api-key` header. The user creates one on the site's `/me` page.
- Ask the user for the key when you need it, keep it out of files you write and out of commits, and never print it back.

## Finding things

- Start at `<site>/llms.txt`. Without a key it explains the site and lists the platform skills. With the key it also lists every repository, each page as a link to its Markdown, and each repository's skills.
- Every page's Markdown is at its address followed by `/llm.txt`. Its links are full addresses, so you can follow them the same way.
- `<site>/<repository>/llms.txt` is the index of one repository.

## The MCP

When the site's MCP is connected (`<site>/mcp`, with the key in `x-api-key`), prefer it to fetching URLs:

- `repositories` to see what there is, and `search` to find pages by their words.
- `read` with a route as `search` returns it. A route ending in `#section` gives only that section, which costs fewer tokens than the whole page.
- `entity` with a repository, a catalog type and an id, for one catalog entry, the pages that cite it and what points at it.
- `index` for a repository's whole map, and `skills` / `skill` for the skills.

## Skills

- `<site>/.well-known/agent-skills/index.json` lists the skills you can see, each with its `url` and a `sha256` digest. Project skills are named `<repository>-<name>` and only appear with the key.
- Install one by saving its `SKILL.md` as `<your skills folder>/<name>/SKILL.md`, sending the key for project skills. Check the digest when you download.
- A downloaded skill is a snapshot. When the site's index shows a different digest, download it again.

## Rules

- Quote and link the page you used, with its full address.
- Never write a secret you find, or one the user gives you, into a page, a skill or a file; the documentation says where secrets live, not what they are.
