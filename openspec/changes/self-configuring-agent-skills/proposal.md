## Why

A user who signs up should be able to copy one text from `/me`, paste it into their AI and have it configure itself: links to the site, how to read it, what each documented project is about, and how to write documentation for the platform. Today that doesn't work. The text only installs single `SKILL.md` files. The writing skills (`doc-example/.agents/skills/`, with their `references/`) can't be served. The platform serves `doc-writing`, a thin, stale copy of those skills, so every site ends up holding its own editable copy of `.agents/`, as the homelab repository did. `colofon` doesn't know the newer MCP tools either.

## What Changes

- **Writing skills served by the platform.** The common writing skills in `doc-example/.agents/skills/` (`documentation`, `docs`, `catalog`, `diagrams`, `styles`, `skills`) become platform skills, renamed with a `colofon-` prefix so they don't clash with other projects' skills once installed for the whole user. `doc-example/.agents/skills/` stays the only source: the backend reads it, and nothing is copied.
- **The `/doc:` commands become skills** (`colofon-check`, `colofon-review`, `colofon-new-page`, `colofon-diagram`, `colofon-pending`, `colofon-questions`), so they reach agents the same way. In Claude Code they are still invoked with `/`. `.agents/commands/` is removed.
- **Multi-file skills.** A platform skill with files besides its `SKILL.md` is listed in the discovery index as `type: "archive"`, a deterministic `.tar.gz` with `SKILL.md` at its root, whose digest covers the archive's bytes. Each of its files can also be read on its own. Single-file skills stay `skill-md`. The MCP `skills` tool says which skills have files, and `skill` can read any of them.
- **BREAKING:** the platform skill `doc-writing` is removed, replaced by the `colofon-*` writing skills.
- **`colofon` is completed** with the `secrets`, `request` and `sync` tools, how to refresh installed skills, and that writing a content repository means loading `colofon-documentation`.
- **One-paste setup.** `/llms.txt`'s agent guide gains a setup procedure:
  - install every skill the index lists (`skill-md` or `archive`) in the agent's personal skills folder, checking each digest;
  - then, only if the user wants tools, connect the MCP.
  
  The `/me` text becomes a short prompt pointing at that procedure. The dialog that shows a newly created API key offers the same prompt with the key already in it.
- **Content repositories no longer copy `.agents/`.** A site's `AGENTS.md` keeps the common rules and its «Este sitio» section, and tells the agent to use the installed `colofon-*` skills. `doc-example`'s `AGENTS.md`, README and guide pages (`publishing/agents`, `publishing/writing-agents`) say so. Migrating existing site repositories (homelab) is left to each repository.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `agent-skills`:
  - the platform skills: `doc-writing` replaced by the `colofon-*` writing skills read from `doc-example/.agents/skills/`, and the contents of `colofon`;
  - archive skills in the discovery index, their archive route and their individual file routes;
  - the setup prompt on `/me` and in the created-key dialog.
- `documentation-llm-text`: the agent guide in `/llms.txt` gains the setup procedure (install every skill, archives included, then the optional MCP), replacing the single-`SKILL.md` install instructions.
- `documentation-mcp`: `skills` reports whether a skill has files and lists them, and `skill` reads one of a skill's files, not only its `SKILL.md`.
- `api-key-management`: the created-key dialog on `/me` adds the setup prompt, carrying the new key, to its ways of connecting an AI.

## Impact

- `packages/api`:
  - `v1/skills` (read a second skills root, archive building, file reads);
  - `v1/mcp/tools.ts` and `server.ts`;
  - `v1/docs/llm-text.ts`;
  - `packages/api/skills/` (`doc-writing` removed, `colofon` rewritten);
  - their tests.
- `packages/content/src/contract/skills.ts`: reading a skill's extra files for platform skills. Content repositories' `skills/` stay single-file.
- `apps/frontend`: the `/.well-known/agent-skills/` routes (index, archive, files), `skills-prompt.ts`, the profile's skills section and the created-key dialog.
- Docker: `.dockerignore` and `apps/backend/Dockerfile` must ship `doc-example/.agents/skills/` in the backend image, which today excludes `doc-example/`.
- `doc-example`:
  - `.agents/skills/` renamed to `colofon-*`, with the commands turned into skills;
  - `.claude/` links updated;
  - `AGENTS.md`, `README.md` and the two `publishing` pages updated.
- Agents that installed `doc-writing` keep a stale copy until they refresh from the index.
