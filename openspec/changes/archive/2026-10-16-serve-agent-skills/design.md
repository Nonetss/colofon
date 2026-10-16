## Context

- Content repositories are cloned to disk. `ContentReader.site(slug)` reads a checkout once (pages, catalog, styles, site problems on the home), and `reader.folderOf(repository)` gives the clone folder. `v1.docs.file` already reads files from a clone with a `realpath` guard.
- `packages/content/src/pages/header.ts` parses front matter with `yaml` (`parseDocument`). Site problems are collected by `readSite` and shown to admins on the home.
- `v1.docs.*` are `protectedProcedure`, so any signed-in user reads every repository today (no per-repository permissions yet, `TODO.md` 2). `publicProcedure` exists in `packages/api/src/index.ts`.
- `/llms.txt`, `/<slug>/llms.txt` and `llm.txt` are Astro routes in `apps/frontend/src/pages/` that call `v1.docs.nav`/`page` through `createServerClient(request)`, which forwards the request's cookies and `x-api-key`. The text comes from `packages/api/src/v1/docs/llm-text.ts`, which the MCP's `index` tool also returns. The middleware (`apps/frontend/src/middleware.ts`) lets only `/login`, `/signup` and `/logo.svg` through without a session. It answers the Markdown routes 401 (`isMarkdownTextPath`) and redirects everything else to `/login`.
- The backend image runs a tsdown bundle (`apps/backend/dist`) and copies `packages/db/src/migrations` beside it. The migrator finds the migrations relative to the working directory (`../../packages/db/src/migrations`). Files that aren't imported don't reach the image unless the Dockerfile copies them.
- Discovery draft v0.2.0: `/.well-known/agent-skills/index.json` with `$schema` and `skills[]` (`name`, `type`, `description`, `url`, `digest`), and `SKILL.md` as `text/markdown`. It assumes public, CORS-open files and says nothing about authentication.

## Goals / Non-Goals

**Goals:**

- An agent given only the site's address can learn everything it can do, and how to get the key it needs, without a credential and without seeing private content.
- One source for "which skills does this caller see": the routes, `/llms.txt` and the MCP all read it through the same procedures.
- Content skills are read with the checkout, like the pages, so a sync is all it takes to publish one.

**Non-Goals:**

- Multi-file skills (the draft's `archive` type), `/.well-known/api-catalog`, a `Link` header, CORS preflight.
- Per-repository permissions. Content skills use the same access rule as the reader, whatever it is.
- Changing `llm.txt`, the reader or "Copiar en Markdown".

## Decisions

### 1. Reading `skills/`: `packages/content/src/contract/skills.ts`

A new module in the `contract` area, exported through the barrel. Like `catalog.ts`, it reads one folder of the contract, and a new area would change `content-package-structure`:

- `readSkills(root): Promise<{ skills: ContentSkill[]; problems: ContentProblem[] }>`
- `ContentSkill = { name, description, text }`, where `text` is the raw file as a string.

It validates per the `content-contract` "Skills folder" requirement: the name pattern; a `SKILL.md` that starts with `---` front matter, parsed with `yaml` as `header.ts` does; `name` equal to the folder name; `description` of 1 to 1024 characters; and any file directly under `skills/` reported. `readSite` calls it and puts `skills` on the `Site`, with its problems among the site's problems. So they are cached per checkout and shown on the home like those of `menu.yaml` or `styles/`. A missing `skills/` is no problem.

The same `readSkills` reads the platform skills (Decision 2), so both sets follow one set of rules. The skill name rule is a small exported function (`isSkillName`) that the tests and the API reuse.

*Alternative:* reading `skills/` in the API on each request. It would duplicate the problems path and read the disk on every call.

### 2. Platform skills: `packages/api/skills/<name>/SKILL.md`, copied into the image

- They live next to the code that serves them: `colofon` (new) and `doc-writing` (moved from `doc-example/skills/` and updated to the English contract names: `catalog/`, `_type.yaml`, `diagrams/`, `styles/`, and Spanish YAML keys).
- They are read with `readSkills` once per process: the handler factory starts the read and keeps the `Promise` in a `const`, so there is no `let` + `??=`. The folder is resolved relative to the working directory, as the migrator does (`../../packages/api/skills` from `apps/backend`). The handler factory takes the folder as an option, so tests pass a fixture folder.
- An invalid platform skill is skipped like a content one would be, and its unit test (`tests/v1/skills/platform.test.ts`) fails, so CI catches it. Throwing from a read the router starts on import would leave an unhandled rejection.
- `apps/backend/Dockerfile` copies `packages/api/skills` to `/app/packages/api/skills`, like the migrations. The dev stack mounts the source tree, so it already sees the folder.

### 3. `v1.skills`: public procedures that widen with a session

A new feature `packages/api/src/v1/skills/{input,output,handler,router}.ts`:

- `list` (`GET /v1/skills`) returns `{ skills: [{ name, repository: { slug, name } | null, description, path, digest }] }`. `path` is `/.well-known/agent-skills/<name>/SKILL.md`. Callers add the origin, as they do for reader routes.
- `get` (`GET /v1/skills/{name}`) returns `{ name, text }`, or `NOT_FOUND` with a Spanish message.

Both are `publicProcedure`.

- Without a user in the context, they see only the platform skills.
- With one, they also see the skills of the repositories the docs `nav` shows that user. The handler reuses the docs handler's `nav` for the list and order of repositories, and `reader.site(slug)` for each site's `skills`. When per-repository permissions land in the docs procedures, the same filter applies here.
- Published name and text: for a content skill, `<slug>-<name>`, with the front matter's `name:` value replaced by a function that edits only that line inside the front matter block. A published name over 64 characters, or equal to a platform skill's name, is left out. The site's problems already cover a skill that was invalid.
- `digest` is `sha256:` + hex over the UTF-8 bytes of the served text (`node:crypto`), computed per request. The files are small.

*Alternative:* serving the skills straight from the frontend by reading disk. The frontend has no clone folders, and it would split the access rule from the reader's.

### 4. Frontend routes and the middleware

- `apps/frontend/src/pages/.well-known/agent-skills/index.json.ts` calls `v1.skills.list()`. It writes the draft's JSON with `$schema`, `type: "skill-md"` and `url = origin + path`.
- `apps/frontend/src/pages/.well-known/agent-skills/[name]/SKILL.md.ts` calls `v1.skills.get({ name })`, and answers `text/markdown; charset=utf-8`, or 404 `text/plain` in Spanish on `NOT_FOUND`.
- Both send `Access-Control-Allow-Origin: *` and `cache-control: private, no-cache`.
- `/llms.txt` changes:
  - With `locals.user`, it calls `nav` and `skills.list` and writes `llmsIndex(repositories, skills, origin)`.
  - Without one, it calls only `skills.list` (public) and writes `llmsGuide(skills, origin)`.
- The middleware gets a list of **optional-credential paths**: `/llms.txt`, `/.well-known/agent-skills/index.json` and `/.well-known/agent-skills/<name>/SKILL.md`, matched in a helper next to `isMarkdownTextPath` and covered by its tests. For them it resolves the session exactly as today. Without one, it calls `next()` with `locals.user` null instead of answering 401. The 401 text of the other Markdown routes adds the full address of `/llms.txt`.

### 5. The guide in `llm-text.ts`

The guide is a function `agentGuide(origin, platformSkills)` that returns the Spanish lines the spec lists:

- Credentials: `/me` and `x-api-key`.
- MCP: `/mcp`, `claude mcp add --transport http colofon <origin>/mcp --header "x-api-key: <tu API key>"` and the tool names.
- Skills: the index address, each platform skill as a link with its description, and an install example:

  ```sh
  mkdir -p ~/.claude/skills/<name> && curl -H "x-api-key: <tu API key>" <url> -o ~/.claude/skills/<name>/SKILL.md
  ```

  It says the folder depends on the agent.

Built from it:

- `llmsIndex(repositories, skills, origin)`: the title, the summary, the guide, then the repository sections. Each section ends with `### Skills` when that repository serves any.
- `llmsGuide(skills, origin)`: the title, the summary, the guide and the line about what a key adds.
- `repositoryLlmsIndex(repository, skills, origin)`: adds its skills, and the paragraph names `/llms.txt`.

The MCP's `index` tool keeps returning exactly what `/llms.txt` returns for the caller, so it also calls `skills.list`.

The MCP command duplicates the one in `apps/frontend/src/features/api-keys/manage/model/agent-setups.ts`. A test in `packages/api` asserts that the guide holds the same command shape. `references/api/mcp.md`, which already says "keep them in step", lists both places.

### 6. MCP tools

`ToolScope` gains `skills: Pick<AppRouterClient["v1"]["skills"], "list" | "get">`, which `apps/backend/src/routers/mcp.ts` passes from the same caller client.

- `skillsTool` writes the text and the structured content of the spec.
- `skillTool({ name })` returns `get`'s text. `NOT_FOUND` becomes a tool error that points at `skills`.

Both have the read-only annotations, and the instructions add a line about them.

### 7. `doc-example`

- `docs/publishing/agents.mdx` explains the addresses, the `<slug>-<name>` naming, the front matter rules and where the problems show.
- `skills/doc-writing/` is removed (it becomes a platform skill).
- A short sample content skill takes its place: `skills/guide/SKILL.md`, saying how to work with this guide specifically. The page cites it.
- The repository's own `.agents/skills/skills` skill (instructions for writing served skills) gets the naming and validation rules.
- It is a subtree. The commit goes in this repository, and pushing to its own remote follows the usual workaround.

## Risks / Trade-offs

- **Astro and a dot folder under `src/pages/`.** `.well-known` routes are a common Astro pattern, but check during apply that `src/pages/.well-known/` is routed. If it isn't, the fallback is a middleware rewrite from `/.well-known/agent-skills/*` to a regular route.
- **Rewriting a content skill's `name`** changes the author's bytes. That is needed so the served folder name and the front matter agree (the Agent Skills format requires it). The digest is over the served bytes, so clients verify what they get.
- **A skills index that differs by credential.** Clients that cache the anonymous index miss the project skills. `/llms.txt` tells the agent to send the key, and the index is `private, no-cache`.
- **An authenticated browser fetch across origins** needs a preflight for `x-api-key`, which is not handled. Agents fetch from the command line, so this is out of scope.
- **The guide's MCP command can drift from the `/me` dialog.** Decision 5's test and the reference note keep them together.
