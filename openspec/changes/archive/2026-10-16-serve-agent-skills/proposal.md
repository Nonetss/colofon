## Why

Today an agent you hand the site's URL gets a 401 from `/llms.txt` and learns nothing, not even how to authenticate. It can't find out that there is an MCP or which skills each project has. `VISION.md` and `TODO.md` 5 plan for the site to tell an agent what it can do and serve skills it can install. The content contract already reserves `skills/<name>/SKILL.md`, but nothing reads it.

## What Changes

- **`/llms.txt` becomes the agent's entry point.** Without a credential it answers 200 with a guide (in Spanish, like the rest of the index): what the site is; how to get an API key at `/me` and send it in `x-api-key`; how to connect the MCP at `/mcp`, with the `claude mcp add` command and the tools; and where the skills are, with how to download them. With a credential it adds the same repository sections as today plus each repository's skills. The `<page>/llm.txt` and `/<slug>/llms.txt` routes still need a credential.
- **Skills over the Agent Skills discovery draft** (Cloudflare RFC, v0.2.0):
  - `/.well-known/agent-skills/index.json` lists every skill the caller can see. Each entry has `name`, `type: "skill-md"`, `description`, `url` and a `sha256:` `digest` of the served bytes, under the draft's `$schema`.
  - `/.well-known/agent-skills/<name>/SKILL.md` serves the skill as `text/markdown`.
  - Both answer without a credential with the platform's skills only. With a credential they also include the skills of every repository the caller can read.
- **Two sets of skills:**
  - **Platform skills** live in this repository and are the same on every site:
    - `colofon` (new): how an agent works with the platform: the indexes, the Markdown routes, the MCP, the skills and the key.
    - `doc-writing`: how to write a content repository, moved here from `doc-example/skills/` and updated to the current English contract names.
  - **Content skills** live in a repository's `skills/<name>/SKILL.md`. They are published as `<slug>-<name>`, with the `name` in their front matter rewritten to match, so two projects can each have a `deploy` skill and the agent can tell whose it is.
- **Skills in the content contract.** A skill's folder name follows the skill naming rule, and its `SKILL.md` has front matter with a `name` equal to the folder name and a `description`. A broken skill is reported as a site problem (shown on the home to admins) and left out. The other skills are still served.
- **MCP:** two new read-only tools. `skills` lists the skills the caller can see. `skill(name)` returns one `SKILL.md`. They read through the same procedures as the routes.
- **`doc-example`:** its `publishing/agents` page explains the new addresses and the `<slug>-<name>` naming, `skills/doc-writing` leaves (it is now a platform skill), and a small content skill takes its place as the example.
- Out of scope:
  - Per-repository permissions (`TODO.md` 2): content skills follow whatever the reader lets the caller read.
  - Skills with more files than `SKILL.md` (the draft's `archive` type).
  - CORS preflight for `x-api-key` from browsers.
  - The `/.well-known/api-catalog` advertisement.

## Capabilities

### New Capabilities

- `agent-skills`: the platform and content skills, the discovery index and the `SKILL.md` routes (paths, entry fields, digest, content types, naming with the repository's slug, what a caller with and without a credential sees, errors).

### Modified Capabilities

- `documentation-llm-text`:
  - `/llms.txt` answers without a credential with the agent guide.
  - With a credential, it holds the guide followed by the repositories.
  - Each repository section, and `/<slug>/llms.txt`, lists its skills.
  - The credentials requirement exempts `/llms.txt`.
- `content-contract`: a new requirement for the `skills/` folder (folder naming, `SKILL.md` front matter, problems).
- `documentation-mcp`: the tool list gains `skills` and `skill`, the instructions mention them, and there are new requirements for both tools.

## Impact

- **packages/content**: reading and validating `skills/` as part of the site read (cached per checkout, problems on the home).
- **packages/api**:
  - The platform skills under `packages/api/skills/<name>/SKILL.md`.
  - A `v1.skills` feature with public `list`/`get` procedures that add the content skills when there is a session.
  - The `llms.txt` guide in `src/v1/docs/llm-text.ts`.
  - The two MCP tools.
  - Tests.
- **apps/frontend**:
  - Astro routes for `/.well-known/agent-skills/index.json` and `…/<name>/SKILL.md`.
  - `/llms.txt` with an optional credential.
  - The middleware lets those three paths through without a session.
- **apps/backend / Docker**: the backend image copies `packages/api/skills/`, as it copies the migrations, because the bundle doesn't include them.
- **doc-example** (a subtree of its own repository): the page, the moved skill and the sample skill.
- **Stack skill**: `references/api/mcp.md` (the new tools) and a reference for the skills feature, with its row in `SKILL.md`.
- No database or migration changes.
